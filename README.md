# ip-vendor-scanner

Scans a range of IP addresses and returns a list of network names and vendors

## Example usage

### npx

```bash
npx ip-vendor-scanner
```
if you have npm version 5.2 or above you can run this command without having to install anything first.

### Global install

```bash
npm install -g ip-vendor-scanner
ip-vendor-scanner
```
If you are on an older version of npm or if you want the command to immediately available then install the package globally

### Search for specific network name

```bash
npx ip-vendor-scanner -n myDesktop
```
or
```bash
npx ip-vendor-scanner --name myDesktop
```
filters the returned list of ip addresses by the supplied name. The string is converted to a regular expression so complex matches are possible

### Search for specific vendor

```bash
npx ip-vendor-scanner -v Google
```
or
```bash
npx ip-vendor-scanner --vendor Google
```
filters the returned list of ip addresses by the supplied vendor. The string is converted to a regular expression so complex matches are possible

### Help

```bash
npx ip-vendor-scanner -h
```
or
```bash
npx ip-vendor-scanner --help
```

Shows help text