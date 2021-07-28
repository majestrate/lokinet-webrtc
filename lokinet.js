
/// requure dns promisese for lokinet awareness
const dns = require('dns').promises;

/// make a resolver
const resolver = new dns.Resolver();
/// set resolver to use lokinet resolver
/// on windows/mac it's 127.0.0.1 on linux it's 127.3.2.1
resolver.setServers(['127.3.2.1']);



const get_our_loki_address = async () => {
  /// resolve our local .loki address
  const addrs = await resolver.resolveCname("localhost.loki");
  return addrs[0];
}

const get_loki_ip = async() => {
  const localaddr = await get_our_loki_address();
  console.log(localaddr);
  const addrs = await resolver.resolve(localaddr);
  console.log(addrs);
  return addrs[0];
}

const get_remote_address = async (ip) => {
  const addrs = await resolver.reverse(ip);
  return addrs[0];
}

const lookup_addr = async (addr) => {
  const addrs =  await resolver.resolve(addr);
  return addrs[0];
}

module.exports = {
  localip: get_loki_ip,
  localaddr: get_our_loki_address,
  ip_to_addr: get_remote_address,
  addr_to_ip: lookup_addr
}
