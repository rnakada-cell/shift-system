import { PosconeClient } from './lib/poscone';
import * as dotenv from 'dotenv';
dotenv.config();

async function testLogin() {
  const id = process.env.POSCONE_LOGIN_ID;
  const pw = process.env.POSCONE_LOGIN_PW;
  
  console.log(`Checking login for ID: ${id}`);
  
  if (!id || !pw) {
    console.error("Missing POSCONE_LOGIN_ID or POSCONE_LOGIN_PW in .env");
    return;
  }

  const client = new PosconeClient(id, pw);
  const success = await client.login();
  
  if (success) {
    console.log("✅ POSCONE Login Successful!");
  } else {
    console.log("❌ POSCONE Login Failed. Please check .env credentials.");
  }
}

testLogin().catch(console.error);
