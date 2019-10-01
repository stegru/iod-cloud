# gpii-iod-cloud

**Proof of concept, not for production**

Central controller for IoD Servers.

Used by IoD Servers to get a publicly resolving DNS name in order to obtain a trusted certificate from Let's Encrypt.

Used by IoD clients to get the address of the IoD server for their deployment site.


## How it works

iod-servers detect their internal IP address, and inform iod-cloud (this service). iod-cloud generates a hostname for
the iod-server, which resolves publicly but to an internal IP address.

An iod-server is able to request a trusted certificate from Let's Encrypt using the DNS-01 verification method. The
iod-server tells iod-cloud to update the TXT DNS record with the challenge.

Clients (Morphic) can get the hostname of their local iod-server from iod-cloud.


## Requirements

A DNS zone, whose name server is this machine.
