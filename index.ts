require('dotenv').config()
import rows from "./wss-conf.json"
// Import
import { ApiPromise, WsProvider } from '@polkadot/api';
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  pool: true,
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
}
});
const verifyStatus = async () => {
  const listWSS: any = []
  try {
    for (let index = 0; index < rows.length; index++) {
      const element = rows[index];
      // Construct
      const wsProvider = new WsProvider(element.wss);
      const api = await ApiPromise.create({ provider: wsProvider });
      
      listWSS.push(api)
    }
    let countError = 0;
    console.log(process.env.EMAIL_FROM)
    setInterval(async () => {
      let wss = "";

      try {
       
        for (let index = 0; index < listWSS.length; index++) {
          const element = listWSS[index];
          wss = rows[index].wss;
          // Do something
          // Retrieve the chain name
          const chain = await element.rpc.system.chain();

          // Retrieve the latest header
          const lastHeader = await element.rpc.chain.getHeader();

          // Log the information
          //console.log(`${chain}: last block #${lastHeader.number} has hash ${lastHeader.hash}`);
          
        }
        countError = 0
      } catch (error:any) {
        countError += 1
        console.log("erro",countError)
        if(countError==3)
          sendEmail("Erro : "+wss +"\n"+error.message, wss)  
        console.log(error)
      }

    }, 2000);

  } catch (error) {
    console.log(error)
  }

}
const sendEmail = async (message:string, subject:string) =>{
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM, // sender address
      to: process.env.EMAIL_TO, // list of receivers
      subject: "Erro Node Lunes "+ subject, // Subject line
      text: message, // plain text body
    });
  
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.log("erro envio",error)
  }
}
verifyStatus()