#!/usr/bin/env node

import commandLineArgs from 'command-line-args';
import { ICommandLineArgs, IIpVendor } from './contracts';
import {
    verifyRange,
    getDefaultRange,
    expandRange,
    logProgress,
    getIpName,
    printWelcomeMessage,
    getVendors,
    printResultsTable,
} from './helpers';
import { networkInterfaces } from 'os';
import { from, defer } from 'rxjs';
import { mergeMap, filter, share, toArray, scan, combineLatest } from 'rxjs/operators';
import { promise as pingPromise } from 'ping';
import { getTable } from '@network-utils/arp-lookup';

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

let ipCount = 0;
let vendors: IIpVendor[] = [];
const ipTableStream = defer(() => from(getTable()));

ipStream
    .pipe(
        toArray(),
        combineLatest(ipTableStream),
        mergeMap(([responses, arpTable]) => getVendors(responses, arpTable), 1),
        filter((ip) => (vendorRegExp != null ? vendorRegExp.test(ip.vendor) : true)),
        scan((all, vendor) => [...all, vendor], new Array<IIpVendor>()),
    )
    .subscribe(
        (results) => {
            vendors = results;
            logProgress(ipCount, vendors);
        },
        undefined,
        () => printResultsTable(vendors),
    );

ipStream.pipe().subscribe(() => logProgress(++ipCount));
