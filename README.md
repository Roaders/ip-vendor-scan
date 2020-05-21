# ip-vendor-scan

Scans a range of IP addresses and returns a list of network names and vendors

## Example usage

### npx

```bash
npx ip-vendor-scan
```
if you have npm version 5.2 or above you can run this command without having to install anything first.

### Global install

```bash
npm install -g ip-vendor-scan
ip-vendor-scan
```
If you are on an older version of npm or if you want the command to immediately available then install the package globally

### Search for specific network name

```bash
npx ip-vendor-scan -n myDesktop
```
or
```bash
npx ip-vendor-scan --name myDesktop
```
filters the returned list of ip addresses by the supplied name. The string is converted to a regular expression so complex matches are possible

### Search for specific vendor

```bash
npx ip-vendor-scan -v Google
```
or
```bash
npx ip-vendor-scan --vendor Google
```
filters the returned list of ip addresses by the supplied vendor. The string is converted to a regular expression so complex matches are possible

### Help

```bash
npx ip-vendor-scan -h
```
or
```bash
npx ip-vendor-scan --help
```

Shows help text