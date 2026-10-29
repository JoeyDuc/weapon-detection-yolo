import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {UploadZone,validateFile} from './components/detection/UploadZone'
import {EmptyState,ErrorState} from './components/shared/Common'
import {Layout} from './components/layout/Layout'
import {useCamera,cameraError} from './hooks/useCamera'
import {useWebSocket} from './hooks/useWebSocket'
import Settings from './pages/Settings'
import * as services from './services/api'
function wrap(ui:React.ReactNode){const client=new QueryClient({defaultOptions:{queries:{retry:false}}});return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)}
vi.mock('./services/api',async()=>{const actual=await vi.importActual<typeof services>('./services/api');return{...actual,getHealth:vi.fn().mockResolvedValue({status:'ok'}),getModel:vi.fn().mockResolvedValue({ready:false,checkpoint:'models/weapon.pt',supported_classes:[],available_devices:['cpu'],device:'cpu',error:'Missing checkpoint',limitation:'Gun requires custom weights'}),getSettings:vi.fn().mockResolvedValue({confidence:.5,iou:.45,image_size:640,device:'auto',confirmation_frames:3,alert_cooldown:10,show_boxes:true,show_labels:true}),patchSettings:vi.fn().mockImplementation(v=>Promise.resolve(v))}})
describe('workspace',()=>{
 it('renders navigation to all seven workspaces',()=>{wrap(<Layout/>);for(const name of ['Overview','Live Detection','Video Analysis','Image Analysis','Detection History','Analytics','Settings'])expect(screen.getByRole('link',{name:new RegExp(`^${name}$`)})).toBeInTheDocument()})
 it('rejects unsupported, empty and oversized uploads',()=>{expect(validateFile(new File(['bad'],'image.svg'),'image')).toContain('JPG');expect(validateFile(new File([],'image.jpg'),'image')).toContain('empty');const big=new File(['x'],'video.mp4');Object.defineProperty(big,'size',{value:501*1024*1024});expect(validateFile(big,'video')).toContain('500 MB')})
 it('passes a valid image file to the uploader',()=>{const callback=vi.fn();render(<UploadZone kind="image" onFile={callback}/>);const file=new File(['image'],'test.png',{type:'image/png'});fireEvent.change(screen.getByLabelText('Upload image'),{target:{files:[file]}});expect(callback).toHaveBeenCalledWith(file)})
 it('shows an honest empty state and actionable API error',()=>{render(<><EmptyState title="No events yet" description="Start an analysis."/><ErrorState error={new Error('Backend unavailable')} retry={()=>{}}/></>);expect(screen.getByText('No events yet')).toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable');expect(screen.getByRole('button',{name:'Try again'})).toBeEnabled()})
 it('explains permission denial',async()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn().mockRejectedValue(new DOMException('Denied','NotAllowedError'))}});function Camera(){const camera=useCamera();return <><button onClick={()=>camera.start()}>Start</button><p>{camera.error}</p></>};render(<Camera/>);fireEvent.click(screen.getByText('Start'));await screen.findByText(/Camera access was denied/);expect(cameraError(new DOMException('Busy','NotReadableError'))).toContain('in use')})
 it('saves changed settings through the backend',async()=>{wrap(<Settings/>);const field=await screen.findByLabelText('Confidence threshold');fireEvent.change(field,{target:{value:'0.7'}});fireEvent.click(screen.getByRole('button',{name:'Save changes'}));await waitFor(()=>expect(services.patchSettings).toHaveBeenCalledWith(expect.objectContaining({confidence:.7}),expect.anything()))})
 it('closes a websocket when its consumer unmounts',()=>{const close=vi.fn();class Socket {static OPEN=1;readyState=1;bufferedAmount=0;close=close;send=vi.fn();onclose=null;onmessage=null;onerror=null;onopen=null}vi.stubGlobal('WebSocket',Socket);function Consumer(){const ws=useWebSocket(()=>{});return <button onClick={ws.connect}>Connect</button>}const view=render(<Consumer/>);fireEvent.click(screen.getByText('Connect'));view.unmount();expect(close).toHaveBeenCalled();vi.unstubAllGlobals()})
})
