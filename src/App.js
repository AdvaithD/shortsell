import React, { Component } from 'react'
import promisify from "tiny-promisify"
import Dharma from "@dharmaprotocol/dharma.js";
import BigNumber from "bignumber.js";

import { Button, FormGroup, ControlLabel, FormControl, HelpBlock, Well } from "react-bootstrap";

import DebtKernel from '../build/contracts/DebtKernel.json'
import RepaymentRouter from '../build/contracts/RepaymentRouter.json'
import TokenTransferProxy from '../build/contracts/TokenTransferProxy.json'
import TokenRegistry from '../build/contracts/TokenRegistry.json'
import DebtToken from '../build/contracts/DebtToken.json'
import TermsContractRegistry from "../build/contracts/TermsContractRegistry.json"
import ShortTermsContract from "../build/contracts/ShortTermsContract.json"
import Collateralized from "../build/contracts/Collateralized.json"
import DAI from "../build/contracts/DAI.json"

import getWeb3 from './utils/getWeb3'

import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css'

class App extends Component {
  constructor(props) {
    super(props)

    this.handlePrincipalAmountChange = this.handlePrincipalAmountChange.bind(this);
    this.handlePrincipalTokenChange = this.handlePrincipalTokenChange.bind(this);
    this.handleInterestRateChange = this.handleInterestRateChange.bind(this);
    //this.handleInstallmentsTypeChange = this.handleInstallmentsTypeChange.bind(this);
    this.handleTermLengthChange = this.handleTermLengthChange.bind(this);

    this.onGenerateDebtOrder = this.onGenerateDebtOrder.bind(this);
    this.onSignDebtOrder = this.onSignDebtOrder.bind(this);

    this.state = {
      principalAmount: 100,
      interestRate: 10, 
      termLength: 30,
      storageValue: 0,
      web3: null,
      dharma: null,
      principalTokenSymbol: "REP",
      amortizationUnit: "months",
    }
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateDharma()
      this.instantiateShortsell()
    })
    .catch((e) => {
      console.log('Error instantiating Dharma contracts:' + e);
    })
  }
  
  handlePrincipalAmountChange(e) {
      this.setState({
          principalAmount: e.target.value
      });
  }
  
  handlePrincipalTokenChange(e) {
      this.setState({
          principalTokenSymbol: e.target.value
      });
  }
  
  handleInterestRateChange(e) {
      this.setState({
          interestRate: e.target.value
      });
  }
  
  handleInstallmentsTypeChange(e) {
      this.setState({
          amortizationUnit: e.target.value
      });
  }
  
  handleTermLengthChange(e) {
      this.setState({
          termLength: e.target.value
      });
  }
  
  async onGenerateDebtOrder(e) {
      const { principalAmount, principalTokenSymbol, interestRate, amortizationUnit, termLength } = this.state;
      
      const dharma = this.state.dharma;
      
      const tokenRegistry = await dharma.contracts.loadTokenRegistry();
      const principalToken = await tokenRegistry.getTokenAddress.callAsync(principalTokenSymbol);
      
      const simpleInterestLoan = {
          principalToken,
          principalAmount: new BigNumber(principalAmount),
          interestRate: new BigNumber(interestRate),
          amortizationUnit,
          termLength: new BigNumber(termLength)
      };
      
      const debtOrder = await dharma.adapters.simpleInterestLoan.toDebtOrder(simpleInterestLoan);
      console.log(this.state)
      this.setState({ debtOrder: JSON.stringify(debtOrder) });
  }
  
  async onSignDebtOrder(e) {
      if (!this.state.debtOrder) {
          throw new Error("No debt order has been generated yet!");
      }
      
      const debtOrder = JSON.parse(this.state.debtOrder);
          
      debtOrder.principalAmount = new BigNumber(debtOrder.principalAmount);
        debtOrder.debtor = this.state.accounts[0];        
    
      // Sign as debtor 
      const debtorSignature = await this.state.dharma.sign.asDebtor(debtOrder);
      const signedDebtOrder = Object.assign({ debtorSignature }, debtOrder);   
      console.log(debtOrder)
      console.log(this.state.dharma)
      const hash = await this.state.dharma.order.getIssuanceHash(signedDebtOrder); 
      console.log("hash! ", hash)
      this.setState({ debtOrder: JSON.stringify(signedDebtOrder) });
  }

  async instantiateDharma() {
    const networkId = await promisify(this.state.web3.version.getNetwork)();
    const accounts = await promisify(this.state.web3.eth.getAccounts)();
    
    if (!(networkId in DebtKernel.networks &&
          networkId in RepaymentRouter.networks &&
          networkId in TokenTransferProxy.networks &&
          networkId in TokenRegistry.networks && 
          networkId in DebtToken.networks &&
          networkId in TermsContractRegistry.networks)) {
        throw new Error("Cannot find Dharma smart contracts on current Ethereum network.");
    }
    
    const dharmaConfig = {
        kernelAddress: DebtKernel.networks[networkId].address,
        repaymentRouterAddress: RepaymentRouter.networks[networkId].address,
        tokenTransferProxyAddress: TokenTransferProxy.networks[networkId].address,
        tokenRegistryAddress: TokenRegistry.networks[networkId].address,
        debtTokenAddress: DebtToken.networks[networkId].address,
        termsContractRegistry: TermsContractRegistry.networks[networkId].address
    }
    
    const dharma = new Dharma(this.state.web3.currentProvider, dharmaConfig);
    
    this.setState({ dharma, accounts });
  }

  async instantiateShortsell() {
    const networkId = await promisify(this.state.web3.version.getNetwork)();

    const daiToken = this.state.web3.eth.contract(DAI.abi).at(DAI.networks[networkId].address);
    const totalSupply = await promisify(daiToken.totalSupply.call)();
    // await promisify(daiToken.approve(Collateralized.networks[networkId].address, totalSupply).send)();
  }
  render() {
    return (
      <div className="App">
        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
            <h1>Short selling on the Dharma Protocol</h1>
            <h5><b>Offer DAI as collateral to create a Debt Order for an ERC 20</b></h5>
            <div>
                
                  <Button
                    bsStyle="primary"
                    
                  >
                    About
                  </Button>
                  <Button
                    bsStyle="primary"
                    onClick={this.onGenerateDebtOrder}
                  >
                    Create Short
                  </Button>
                  <Button
                    bsStyle="primary"
                    onClick={this.onGenerateDebtOrder}
                  >
                    Relayer
                  </Button>
                  <Button
                    bsStyle="primary"
                    onClick={this.onGenerateDebtOrder}
                  >
                    Settle
                  </Button>
            </div>

            <form>
               <FormGroup
                 controlId="formBasicText"
               >
                 <ControlLabel>Principal Amount</ControlLabel>
                 <FormControl
                   type="number"
                   defaultValue={this.state.principalAmount}
                   onChange={this.handlePrincipalAmountChange}
                 />
                 <HelpBlock>Enter the amount of tokens you would like to borrow.</HelpBlock>
               </FormGroup>

               <FormGroup controlId="formControlsSelect">
                  <ControlLabel>Principal Token</ControlLabel>
                  <FormControl 
                    componentClass="select" 
                    placeholder="select"
                    onChange={this.shandlePrincipalTokenChange}
                >
                    <option value="REP">Augur (REP)</option>
                    <option value="MKR">Maker DAO (MKR)</option>
                    <option value="ZRX">0x Token (ZRX)</option>
                  </FormControl>
                </FormGroup>


                <FormGroup controlId="formControlsSelect">
                   <ControlLabel>Interest Rate (%)</ControlLabel>
                   <FormControl
                     type="number"
                     step="0.001"
                     defaultValue={this.state.interestRate}
                     onChange={this.handleInterestRateChange}
                   />
                 </FormGroup>
                  <FormGroup
                    controlId="formBasicText"
                  >
                    <ControlLabel>Term Length (days)</ControlLabel>
                    <FormControl
                      type="number"
                      defaultValue={this.state.termLength}
                      onChange={this.handleTermLengthChange}
                    />
                  </FormGroup>
                  <Button
                    bsStyle="primary"
                    onClick={this.onGenerateDebtOrder}
                  >
                    Generate Debt Order
                  </Button>
                  <br/><br/>
                  <Button
                    bsStyle="primary"
                    onClick={this.onSignDebtOrder}
                  >
                    Sign Debt Order
                  </Button>
                  <code>{this.state.debtOrder}</code>
                  
             </form>
             <p> Max Wolff, Zach Zeleznick, and Rich McAteer</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App
