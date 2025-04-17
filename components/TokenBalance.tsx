import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, StyleSheet, TouchableOpacity } from 'react-native';

const TokenBalances = ({ address }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const apiKey = "dR-O2nsz3sDydwDik43XDO0n6oSc9Ark";

      const options = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          addresses: [
            {
              address: address,
              networks: ['eth-sepolia'],
            },
          ],
          withMetadata: true,
          withPrices: true,
        }),
      };

      const response = await fetch(`https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`, options);
      const json = await response.json();
      console.log(json);
      setData(json.data.tokens || []);
    } catch (err) {
      console.error('Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (hex, decimals = 18) => {
    try {
      return parseInt(hex, 16) / Math.pow(10, decimals);
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (address) {
      fetchTokens();
    }
  }, [address]);

  const renderItem = ({ item }) => {
    const balance = formatBalance(item.tokenBalance, item.tokenMetadata?.decimals || 18);
    const symbol = item.tokenMetadata?.symbol || 'NATIVE';
    const price = item.tokenPrices?.[0]?.value || 0;
    const logo = item.tokenMetadata?.logo;

    return (
      <View style={styles.tokenItem}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.logo} />
        ) : (
          <View style={styles.placeholderLogo} />
        )}

        <View style={styles.middle}>
          <Text style={styles.symbol}>{symbol === 'NATIVE' ? 'ETH' : symbol}</Text>
          <Text style={styles.price}>${price.toFixed(4)}</Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.balance}>{balance.toFixed(4)}</Text>
          <Text style={styles.total}>${(balance * price).toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={fetchTokens} style={styles.refreshButton}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#00ffcc" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => `${item.tokenAddress || item.network}-${index}`}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingTop: 50,
    paddingHorizontal: 12,
  },
  refreshButton: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  refreshText: {
    color: '#00ffcc',
    fontWeight: 'bold',
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
  },
  placeholderLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  middle: {
    flex: 1,
  },
  symbol: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  price: {
    color: '#ccc',
    fontSize: 14,
  },
  right: {
    alignItems: 'flex-end',
  },
  balance: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  total: {
    color: '#aaa',
    fontSize: 14,
  },
});

export default TokenBalances;