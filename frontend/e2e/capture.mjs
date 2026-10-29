import {chromium} from '@playwright/test'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1})
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.goto('http://127.0.0.1:5173/')
await page.waitForTimeout(1500)
await page.screenshot({path:'../docs/overview-desktop.png',fullPage:true})
await page.setViewportSize({width:390,height:844})
await page.waitForTimeout(500)
await page.screenshot({path:'../docs/overview-mobile.png',fullPage:true})
let video
if(fs.existsSync('../docs/smoke-results.json')){const report=JSON.parse(fs.readFileSync('../docs/smoke-results.json','utf8'));await page.goto(`http://127.0.0.1:8000${report.video.playback_url}`);await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);video=await page.locator('video').evaluate(async el=>{await el.play();return{readyState:el.readyState,duration:el.duration,width:el.videoWidth,height:el.videoHeight,playing:!el.paused}})}
console.log(JSON.stringify({errors,video,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}))
await browser.close()
