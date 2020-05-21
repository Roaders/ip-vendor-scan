import commandLineArgs from 'command-line-args';
import { ICommandLineArgs, IIPNames } from './contracts';
import { verifyRange, getDefaultRange, expandRange, getIpName, logProgress } from './helpers';
import { networkInterfaces } from 'os';
import { from } from 'rxjs';
import { mergeMap, filter, map, share } from 'rxjs/operators';
import { promise as pingPromise } from 'ping';
import { stdout } from 'single-line-log';

const commandOptions: Partial<ICommandLineArgs> = commandLineArgs([{ name: 'range', alias: 'r' }]) as Partial<
    ICommandLineArgs
>;

const defaultOptions: ICommandLineArgs = {
    range: getDefaultRange(networkInterfaces()),
};

const options = { ...defaultOptions, ...commandOptions };

if (!verifyRange(options.range)) {
    throw new Error(`Range '${options.range}'is not in correct format: '192.168.0.[0-255]'`);
}

const ips: IIPNames[] = [];

const ipStream = from(expandRange(options.range)).pipe(
    mergeMap((ip) => from(pingPromise.probe(ip))),
    filter((result) => result.alive),
    map((result) => result.host),
    mergeMap((ip) => getIpName(ip)),
    share(),
);

ipStream.subscribe(
    (result) => {
        ips.push(result);
        logProgress(ips);
    },
    undefined,
    () => {
        stdout.clear();
        ips.forEach((ip) => console.log(`${ip.ip} => ${ip.names}`));
    },
);
