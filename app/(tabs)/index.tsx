// App.tsx or WalletGenerator.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  AppState,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import "react-native-get-random-values";
import "@ethersproject/shims";
import { ethers } from "ethers";
import BottomSheet from "@ahmetaltai/react-native-bottom-sheet";
import * as Clipboard from "expo-clipboard";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import TokenBalances from '@/components/TokenBalance'

import AntDesign from '@expo/vector-icons/AntDesign';

export default function WalletGenerator() {
  const [address, setAddress] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>("Not Found");
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [url, setUrl] = useState("https://google.com/");

  const backupSheetRef = useRef<any>(null);
  const sendSheetRef = useRef<any>(null);
  const webviewSheetRef = useRef<any>(null);
  
  const webviewRef = useRef<any>(null);

  const ALCHEMY_SEPOLIA_RPC =
    "https://eth-sepolia.g.alchemy.com/v2/dR-O2nsz3sDydwDik43XDO0n6oSc9Ark";

  const [ethPrice, setEthPrice] = useState<number | null>(null);

  async function getCoinPrice(symbol: string, convert = 'USD') {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}&convert=${convert}`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': 'e6897679-9540-48b9-816c-a30bc013ac24',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (data?.data?.[symbol]?.quote?.[convert]?.price) {
        const price = data.data[symbol].quote[convert].price;
        console.log(`${symbol} price in ${convert}:`, price);
        return price;
      } else {
        throw new Error('Invalid symbol or conversion currency');
      }

    } catch (error: any) {
      console.error('Error fetching price:', error.message);
      return null;
    }
  }

  // useEffect diye call korte hobe to fetch price on mount
  useEffect(() => {
    (async () => {
      const price = await getCoinPrice('ETH'); // CMC uses symbols like BTC, ETH, etc.
      if (price !== null) setEthPrice(price);
    })();
  }, []);


  const loadWallet = async () => {
    setLoading(true);
    try {
      const storedMnemonic = await AsyncStorage.getItem("wallet_mnemonic");
      if (storedMnemonic) {
        const wallet = ethers.Wallet.fromPhrase(storedMnemonic);
        setAddress(wallet.address);
        setPrivateKey(wallet.privateKey);
        setMnemonic(storedMnemonic);
        fetchBalance(wallet.address);
      } else {
        setAddress(null);
        setPrivateKey(null);
        setMnemonic(null);
        setBalance(null);
      }
    } catch (err) {
      console.log("Error loading wallet:", err);
    }
    setLoading(false);
  };

  const fetchBalance = async (walletAddress: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(ALCHEMY_SEPOLIA_RPC);
      const balanceBigInt = await provider.getBalance(walletAddress);
      const formatted = ethers.formatEther(balanceBigInt);
      setBalance(`${formatted}`);
    } catch (error) {
      console.log("Error fetching balance:", error);
      setBalance("Error");
    }
  };

  useEffect(() => {
    loadWallet();
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadWallet();
      }
    });
    return () => subscription.remove();
  }, []);

  const generateWallet = async () => {
    try {
      setLoading(true);
      const wallet = ethers.Wallet.createRandom();
      await SecureStore.setItemAsync("privateKey", wallet.privateKey);
      await AsyncStorage.setItem("wallet_mnemonic", wallet.mnemonic.phrase);
      await AsyncStorage.setItem("walletBackedUp", "false");
      setAddress(wallet.address);
      setPrivateKey(wallet.privateKey);
      setMnemonic(wallet.mnemonic.phrase);
      fetchBalance(wallet.address);
      Alert.alert("Wallet Generated", `Address: ${wallet.address}`);
    } catch (error) {
      Alert.alert("Error", "Failed to generate wallet.");
    }
    setLoading(false);
  };

  const handleCopyMnemonic = async () => {
    if (mnemonic) {
      await Clipboard.setStringAsync(mnemonic);
      await AsyncStorage.setItem("walletBackedUp", "true");
      bottomSheetRef.current?.close();
      Alert.alert("Copied", "Mnemonic copied and wallet backup status updated.");
    }
  };

  const handleCopyAdrs = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      Alert.alert("Copied", "Wallet address copied");
    }
  };

  const handleSendTransaction = async () => {
    if (!recipient || !amount || !privateKey) {
      Alert.alert("Error", "Recipient and amount are required");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(ALCHEMY_SEPOLIA_RPC);
      const wallet = new ethers.Wallet(privateKey, provider);
      const tx = await wallet.sendTransaction({
        to: recipient,
        value: ethers.parseEther(amount),
      });
      await tx.wait();
      fetchBalance(wallet.address);
      setRecipient("");
      setAmount("");
      Alert.alert("Success", `Transaction sent! Hash:\n${tx.hash}`);
    } catch (err) {
      console.error("Transaction failed:", err);
      Alert.alert("Error", "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    const script = `window.location.href = 'https://google.com/'; true;`;
    webviewRef.current?.injectJavaScript(script);
    setUrl("https://google.com/");
  };

  const goBack = () => {
    webviewRef.current?.goBack();
  };

  const onNavigationStateChange = (navState) => {
    setUrl(navState.url);
  };

  const handleBackdropPress = () => bottomSheetRef.current?.close();
  const handleChangePoint = (index: number) =>
    console.log("Bottom Sheet point:", index);


  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  
  const injectedJS = `
    (function() {
      window.ethereum = {
        isMetaMask: true,
        isConnected: () => true,
        selectedAddress: '${address}',
        request: async ({ method, params }) => {
          switch(method) {
            case 'eth_accounts':
            case 'eth_requestAccounts':
              return ['${address}'];
            case 'eth_chainId':
              return '0xaa36a7'; // Sepolia
            case 'eth_sendTransaction':
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'signTransaction', tx: params[0] }));
              return new Promise((resolve, reject) => {
                window.__resolveTx = resolve;
                window.__rejectTx = reject;
              });
            default:
              throw new Error('Unsupported method: ' + method);
          }
        }
      };
      window.dispatchEvent(new Event('ethereum#initialized'));
    })();
  `;

  const onMessage = async (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === "signTransaction" && privateKey) {
      try {
        const provider = new ethers.JsonRpcProvider(ALCHEMY_SEPOLIA_RPC);
        const wallet = new ethers.Wallet(privateKey, provider);

        const tx = {
          to: data.tx.to,
          value: ethers.getBigInt(data.tx.value),
          gasLimit: data.tx.gas ? ethers.getBigInt(data.tx.gas) : BigInt(21000),
          data: data.tx.data || "0x",
        };

        const txResponse = await wallet.sendTransaction(tx);
        await txResponse.wait();

        const successScript = `if (window.__resolveTx) { 
          window.__resolveTx("${txResponse.hash}"); 
          window.__resolveTx = null; 
        }`;
        webviewRef.current?.injectJavaScript(successScript);
      } catch (error) {
        console.error("Signing failed:", error);
        const failScript = `if (window.__rejectTx) { 
          window.__rejectTx("Transaction failed"); 
          window.__rejectTx = null; 
        }`;
        webviewRef.current?.injectJavaScript(failScript);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 10 }}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!address ? (
        <View
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 20,
            flex: 1,
            width: "100%",
          }}
        >
          <Ionicons name="shield" color="#000" size={80} />
          <TouchableOpacity
            style={{
              backgroundColor: "#000",
              width: "90%",
              height: 50,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 10,
            }}
            onPress={generateWallet}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Create Wallet
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {address && (
        <View style={styles.container}>
          <View style={styles.walletHeader}>
            <Text style={{ fontSize: 35, fontWeight: "bold", color: "#000" }}>
              {ethPrice !== null ? `$${(balance * ethPrice).toFixed(2)}` : `${balance} ETH`}
            </Text>
            <TouchableOpacity onPress={handleCopyAdrs}>
              <Text style={{ fontSize: 15, color: "#000" }}>
                {truncateAddress(address)}
              </Text>
            </TouchableOpacity>

            <View style={styles.walletAction}>
              <View style={styles.actionCont}>
                <TouchableOpacity onPress={() => sendSheetRef.current.open()} style={styles.walletActionBtn}>
                  <Ionicons name="paper-plane" color="#000" size={30} />
                </TouchableOpacity>
                <Text style={{ fontSize: 10, color: "#000" }}>Send</Text>
              </View>
              <View style={styles.actionCont}>
                <TouchableOpacity onPress={() => webviewSheetRef.current.open()} style={styles.walletActionBtn}>
                  <MaterialIcons name="web" size={30} color="black" />
                </TouchableOpacity>
                <Text style={{ fontSize: 10, color: "#000" }}>Send</Text>
              </View>
  
              <View style={styles.actionCont}>
                <TouchableOpacity style={styles.walletActionBtn}>
                  <Ionicons name="copy" color="#000" size={30} />
                </TouchableOpacity>
                <Text style={{ fontSize: 10, color: "#000" }}>Receive</Text>
              </View>
            </View>


            {/*}
           <Button
              title="Backup Wallet"
              onPress={() => bottomSheetRef.current?.open()}
            />
            {*/}
            
          </View>

      
        

        <TokenBalances 
          address={address}
        />

          <Button onPress={() => backupSheetRef.current.open()} title="Backup wallet" />

          <BottomSheet
            ref={webviewSheetRef}
          	index={0}
            points={['80%']}
          >

            <View style={{ height: '90%', width: "100%", marginBottom: 20 }}>
            <View style={[styles.header, { height: 70 }]}>
              <TouchableOpacity onPress={goHome}>
                <AntDesign name="home" size={24} color="black" />
              </TouchableOpacity>
              <TextInput
                style={[styles.urlInput, { flexWrap: "nowrap" }]}
                value={url}
                onChangeText={setUrl}
                onSubmitEditing={() => {
                  const script = `window.location.href = '${url}'; true;`;
                  webviewRef.current?.injectJavaScript(script);
                }}
              />
             <TouchableOpacity onPress={goBack}>
             	<Entypo name="chevron-left" size={24} color='black' />
             </TouchableOpacity>

              <TouchableOpacity onPress={() => {}}>
             	<Entypo name="chevron-right" size={24} color='black' />
             </TouchableOpacity>
            </View>

            <WebView
              ref={webviewRef}
              source={{ uri: url }}
              scrollEnabled={true}
              style={{ flex: 1 }}
              onNavigationStateChange={onNavigationStateChange}
              injectedJavaScriptBeforeContentLoaded={injectedJS}
              onMessage={onMessage}
            />
          </View>

          </BottomSheet>

          <BottomSheet
            ref={backupSheetRef}
            index={0}
            points={["40%"]}
            onChangePoint={handleChangePoint}
            onPressBackdrop={handleBackdropPress}
          >
            <View style={styles.sheetContainer}>
              <Text style={styles.dangerTitle}>Warning: Sensitive Information</Text>
              <Text style={styles.guideText}>
                This mnemonic phrase gives full access to your wallet. Do not
                share it with anyone.
              </Text>
              <View style={styles.mnemonicBox}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.mnemonicText}>{mnemonic}</Text>
                </ScrollView>

                <TouchableOpacity
                  onPress={handleCopyMnemonic}
                  style={styles.copyButton}
                >
                  <Text style={styles.copyText}>Copy Mnemonic</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BottomSheet>

          {/* ssend Bottom sheet */}

          <BottomSheet ref={sendSheetRef}
          index={0}
          points={['90%']}
          >

          <View style={styles.sendCont}>
            <Text style={[styles.label, { marginTop: 20 }]}>Send ETH</Text>
            <TextInput
              style={styles.input}
              placeholder="Recipient Address"
              value={recipient}
              onChangeText={setRecipient}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (in ETH)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendTransaction}
            >
              <Text style={styles.sendText}>Send ETH</Text>
            </TouchableOpacity>
          </View>
          
        </BottomSheet >
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({


  sendCont : {
  	width : "100%", 
		justifyContent : "center",
  	alignItems : "Center"
    
  },
  walletHeader: {
    justifyContent: "center",
    gap : 10,
    alignItems: "center",
    width: "100%",
    paddingVertical: 20,
  },
  
  walletAction: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "90%",
    gap : 10,
  },
  walletActionBtn: {
    backgroundColor: "#fff",
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    
  },
  actionCont: {
    justifyContent: "center",
    alignItems: "center",
    gap : 5,
  },
  container: {
    flexGrow: 1,
    width : "100%",
    justifyContent : "center",
  	alignItems : "center",
    backgroundColor: "#f9fafb",
    alignItems: "center",
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 20,
    width: "100%",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    color: "#374151",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  value: {
    color: "#111827",
    fontSize: 16,
    marginTop: 4,
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    fontSize: 16,
    color: "#111827",
  },
  sendButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    alignItems: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  sheetContainer: {
    padding: 24,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 20,
  },
  dangerTitle: {
    color: "#dc2626",
    fontSize: 20,
    fontWeight: "bold",
  },
  guideText: {
    color: "#7f1d1d",
    fontSize: 15,
    lineHeight: 22,
  },
  mnemonicBox: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  mnemonicText: {
    color: "#b91c1c",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  copyButton: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 12,
  },
  copyText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    padding: 8,
    alignItems: "center",
    backgroundColor: "#f2f2f2",
  },
  urlInput: {
    flex: 1,
    marginHorizontal: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
  },
});