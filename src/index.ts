#!/usr/bin/env node

import commandLineArgs from 'command-line-args';
import { ICommandLineArgs } from './contracts';
import {
    verifyRange,
    getDefaultRange,
    expandRange,
    logProgress,
    getVendor,
    getIpName,
    printWelcomeMessage,
} from './helpers';
import { networkInterfaces } from 'os';
import { from } from 'rxjs';
import { mergeMap, filter, share, toArray, scan } from 'rxjs/operators';
import { promise as pingPromise } from 'ping';
import Table from 'cli-table';

const commandOptions: Partial<ICommandLineArgs> = commandLineArgs([
    { name: 'range', alias: 'r' },
    { name: 'vendor', alias: 'v' },
    { name: 'name', alias: 'n' },
]) as Partial<ICommandLineArgs>;

const defaultOptions: ICommandLineArgs = {
    range: getDefaultRange(networkInterfaces()),
};

const options = { ...defaultOptions, ...commandOptions };

const nameRegExp = options.name ? new RegExp(options.name) : undefined;
const vendorRegExp = options.vendor ? new RegExp(options.vendor) : undefined;

if (!verifyRange(options.range)) {
    throw new Error(`Range '${options.range}'is not in correct format: '192.168.0.[0-255]'`);
}

console.log(printWelcomeMessage(options));

const ipStream = from(expandRange(options.range)).pipe(
    mergeMap((ip) => from(pingPromise.probe(ip, { timeout: 1, numeric: true })), 100),
    filter((result) => result.alive),
    mergeMap(getIpName),
    filter((result) => (nameRegExp != null ? nameRegExp.test(result.host) : true)),
    share(),
);

ipStream
    .pipe(
        mergeMap((ip) => getVendor(ip), 1),
        filter((ip) => (vendorRegExp != null ? vendorRegExp.test(ip.vendor) : true)),
        toArray(),
    )
    .subscribe((ipVendors) => {
        console.log('');

        const table = new Table({ head: ['Address', 'Names', 'Vendor'] });
        table.push(...ipVendors.map((vendor) => [vendor.numeric_host, vendor.host, vendor.vendor]));

        console.log(table.toString());
    });

ipStream.pipe(scan((count) => ++count, 0)).subscribe((count) => logProgress(count));
