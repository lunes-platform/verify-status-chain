require('dotenv').config()
import rows from "./wss-conf-test.json"
// Import
import { WsProvider, ApiPromise, Keyring } from '@polkadot/api';

//contract
import {
  web3Enable,
  web3Accounts,
  web3FromSource,
} from '@polkadot/extension-dapp'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

import { ContractPromise } from '@polkadot/api-contract'
import ABI from './artifacts/lotto/lotto_lunes.json'
const SEED_AUX: string = process.env.SEED_AUX || 'bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice'
const CONTRACT_ADDRESS: string = process.env.CONTRACT_ADDRESS || '5G3VfP36indbUdwLqPggkdbyfJfZg5ZpKyiT3HuD4Wg6tyzG'
// Create a keyring instance
const keyring = new Keyring({ type: 'sr25519' });

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
      } catch (error: any) {
        countError += 1
        console.log("erro", countError)
        if (countError == 3)
          sendEmail("Erro : " + wss + "\n" + error.message, "Erro Node Lunes" + wss)
        console.log(error)
      }

    }, 2000);

  } catch (error) {
    console.log(error)
  }
}
//contract
const getAccount = () => keyring.addFromUri(SEED_AUX);
const getGasLimit = (api: any) =>
  api.registry.createType(
    'WeightV2',
    api.consts.system.blockWeights['maxBlock']
  )
const getContract = (api: any) => {
  return new ContractPromise(api, ABI, CONTRACT_ADDRESS);
}
const executeLotto = async () => {
  const listWSS: Array<string> = []
  for (let index = 0; index < rows.length; index++) {
    const element = rows[index];
    listWSS.push(element.wss)
  }
  const wsProvider = new WsProvider(listWSS);
  const api = await ApiPromise.create({ provider: wsProvider });
  const contract = getContract(api)
  let account = getAccount();
  setInterval(async () => {
    console.log('Start call contract')
    const gasLimit: any = getGasLimit(api);
    let idActive = "";
    try {
      const { result, output }: any = await contract.query['lottoLunesImpl::allRafflePage'](
        account.address,

        {
          gasLimit,
        },
        "1",
        false
      )
      if (result.isErr) {
        return
      }
      if (output && !result.isErr) {
        const object = output.toHuman().Ok?.Ok;
        idActive = object?.lotoLunes?.find((el: any) => el.status)?.raffleId
      }
      if (!idActive)
        return
      doMakeLotto(api, idActive)

    } catch (error) {
      console.log("error", error)
    }
  }, 20000)

}
const doMakeLotto = async (api: any, id: string) => {
  try {
    const contract = getContract(api)
    let account = getAccount();
    const gasLimit: any = getGasLimit(api);
    const { storageDeposit, result, gasRequired }: any = await contract.query['lottoLunesImpl::doRaffleLotto'](
      account.address,
      {
        gasLimit,
        storageDepositLimit: null
      }
    )
    if (result.isErr) {
      let error = ""
      if (result.asErr.isModule) {
        const dispatchError = api.registry.findMetaError(result.asErr.asModule)
        error = dispatchError.docs.length ? dispatchError.docs.concat().toString() : dispatchError.name
      } else {
        error = result.asErr.toString()
      }
      console.log(error)
      return
    }
    if (result.isOk) {
      const flags = result.asOk.flags.toHuman()
      if (flags.includes('Revert')) {

        console.log('Revert')
        console.log(result.toHuman())
        const type = contract.abi.messages[5].returnType
        const typeName = type?.lookupName || type?.type || ''
        const error = contract.abi.registry.createTypeUnsafe(typeName, [result.asOk.data]).toHuman()
        console.log(error)
        return
      }
    }
    await contract.tx['lottoLunesImpl::doRaffleLotto']({
      gasLimit: gasRequired,
      storageDepositLimit: null
    })
      .signAndSend(account, (res) => {
        if (res.status.isInBlock) {
          console.log('in a block')
        }
        if (res.status.isFinalized) {
          console.log(res.txHash.toHuman())
          createAutomaticLotto(api, id)
        }
      })
  } catch (error) {
    console.log("error doMakeLotto", error)
  }
}
const createAutomaticLotto = async (api: any, id: string) => {
  try {
    const contract = getContract(api)
    let account = getAccount();
    const gasLimit: any = getGasLimit(api);
    const { result, gasRequired }: any = await contract.query['lottoLunesImpl::createAutomaticLotto'](
      account.address,
      {
        gasLimit,
        storageDepositLimit: null
      },
      id
    )
    if (result.isErr) {
      let error = ""
      if (result.asErr.isModule) {
        const dispatchError = api.registry.findMetaError(result.asErr.asModule)
        error = dispatchError.docs.length ? dispatchError.docs.concat().toString() : dispatchError.name
      } else {
        error = result.asErr.toString()
      }
      console.log(result)
      console.log(error)
      return
    }
    if (result.isOk) {
      const flags = result.asOk.flags.toHuman()
      if (flags.includes('Revert')) {

        console.log('Revert')
        console.log(result.toHuman())
        const type = contract.abi.messages[5].returnType
        const typeName = type?.lookupName || type?.type || ''
        const error = contract.abi.registry.createTypeUnsafe(typeName, [result.asOk.data]).toHuman()
        console.log(error)
        return
      }
    }
    await contract.tx['lottoLunesImpl::createAutomaticLotto']({
      gasLimit: gasRequired,
      storageDepositLimit: null
    }, id)
      .signAndSend(account, (res) => {
        if (res.status.isInBlock) {
          console.log('in a block')
        }
        if (res.status.isFinalized) {
          console.log(res.txHash.toHuman())
        }
      })
  } catch (error) {
    console.log("error createAutomaticLotto", error)
  }

}
const sendEmail = async (message: string, subject: string) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM, // sender address
      to: process.env.EMAIL_TO, // list of receivers
      subject: subject, // Subject line
      text: message, // plain text body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.log("erro envio", error)
  }
}
executeLotto()
verifyStatus()