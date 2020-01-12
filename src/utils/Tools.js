import { aesDecrypt } from './Aes'
import {ethers} from 'ethers'
var bip39 = require('bip39')
const HDWallet = require('ethereum-hdwallet')

export function mnemonicToAddress(mnemonic, n) {
    const hdwallet = HDWallet.fromMnemonic(mnemonic)
    return `0x${hdwallet.derive(`m/44'/60'/0'/0/` + n).getAddress().toString('hex')}`
}
export function mnemonicToPrivate(mnemonic, n) {
    const hdwallet = HDWallet.fromMnemonic(mnemonic)
    return hdwallet.derive(`m/44'/60'/0'/0/` + n).getPrivateKey().toString('hex')
}
export function jsNumberForAddress(address) {
    const addr = address.slice(2, 10)
    const seed = parseInt(addr, 16)
    return seed
}

export function lngDetector(word) {
    var regex = new RegExp("^([a-z]{0,200})$")
    return regex.test(word.replace(/ /g, ''))
}

export function validateMnemonic(mnemonic) {
    if (lngDetector(mnemonic)) {
        return bip39.validateMnemonic(mnemonic, bip39.wordlists.english)
    } else {
        return bip39.validateMnemonic(mnemonic.replace(/ /g, '').split('').join(' '), bip39.wordlists.chinese_simplified)
    }
}

export function randMnemonic(mnemonic) {
    let randMnemonic = mnemonic.split(' ')
    let newArr = []
    let len = randMnemonic.length
    for (var i = 0; i < len; i++) {
        let index = Math.floor(Math.random() * randMnemonic.length)
        newArr.push(randMnemonic[index])
        randMnemonic.splice(index, 1)
    }
    randMnemonic = [...newArr, ...randMnemonic]
    return randMnemonic
}
export function validatePasswordMnemonic(password,encrypt) {
    if (!password || !encrypt) {
        console.log("encrypt || password Error!")
        return false
    } else {
        let mnemonic = aesDecrypt(encrypt, password)
        console.log('mnemonic:' + mnemonic)
        var bool = validateMnemonic(mnemonic)
        if (!bool) {
            console.log("Mnemonic Error!")
            return false
        }else{
            return mnemonic
        }
    }
}

export function getAccounts(mnemonic){
    const accounts = []
    for (let i = 0; i < 10; i++) {
        accounts[i] = {
            address : mnemonicToAddress(mnemonic, i),
            balance : 0
        }
    }
    return accounts
}
export async function getTxList(networkName,address){
    const ethapi = require('etherscan-api-cn').init('MIQDQDRUD5XENBPYQ8HAB3GJP2Z6T8ZZ1J',networkName,3000)
    try{
        let txlist_ = await ethapi.account.txlist(address,5000000, 'latest')
        let txlist = txlist_.result.reverse()
        
        if(txlist.length>0){
            for(var i=0;i<txlist.length;i++){
                if(txlist[i].to === ''){
                    txlist[i].inputData = '部署合约'
                }else if(txlist[i].to === address){
                    txlist[i].inputData = '存入'
                }else {
                    if(txlist[i].input === '0x'){
                        txlist[i].inputData = '发送'
                        txlist[i].value = txlist[i].value * -1
                    }else{
                        txlist[i].inputData = '合约调用'
                        txlist[i].value = txlist[i].value > 0 ? txlist[i].value * -1 : txlist[i].value
                    }
                }
                txlist[i].value = Math.round(txlist[i].value/100000000000000) / 10000 + `ETH`
                txlist[i].gasFee=Math.round((txlist[i].gasUsed * txlist[i].gasPrice / 1000000000000000000)*100000)/100000
            }
            return txlist
        }else{
            return []
        }
    }catch(e){
        console.log("TCL: getTxList -> e", e)
        return []
    }
}
const gasLimit = 21000
export async function getGasfee(networkName){
    let infuraProvider = new ethers.providers.InfuraProvider(networkName)
    let gasPrice = await infuraProvider.getGasPrice()
    return ethers.utils.formatEther(gasPrice)*gasLimit
}
export async function sendTransaction(to,networkName,mnemonic,currentAccount,value,myGasfee){
    let infuraProvider = new ethers.providers.InfuraProvider(networkName)
    let privateKey = mnemonicToPrivate(mnemonic,currentAccount)
    let wallet = new ethers.Wallet(privateKey, infuraProvider)
    let code = await infuraProvider.getCode(to)
    if (code !== '0x') { throw new Error('目标地址不能是合约地址')}
    
    console.log("TCL: senTransaction -> myGasfee", myGasfee*1000000000000000000 / gasLimit)
    let gasPrice = ethers.utils.bigNumberify(myGasfee*1000000000000000000 / gasLimit)

    let tx = await wallet.sendTransaction({
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        to: to,
        value: ethers.utils.bigNumberify(value*1000000000000000000)
    })
    return tx
}
export async function getBalance(mnemonic,networkName){
    let accounts = []
    let infuraProvider = new ethers.providers.InfuraProvider(networkName)
    for (let i = 0; i < 10; i++) {
        let address = mnemonicToAddress(mnemonic, i)
        let balanceBN = await infuraProvider.getBalance(address)
        let balance = ethers.utils.formatEther(balanceBN)
        accounts[i] = {
            address: address,
            balance: balance
        }
    }
    return accounts
}