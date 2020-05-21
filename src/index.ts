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
import commandLineUsage, { OptionDefinition, Section } from 'command-line-usage';

const defaultOptions: ICommandLineArgs = {
    range: getDefaultRange(networkInterfaces()),
};

const args: OptionDefinition[] = [
    { name: 'range', alias: 'r', description: `Optional. IP range to scan. Defaults to ${defaultOptions.range}` },
    {
        name: 'vendor',
        alias: 'v',
        typeLabel: 'regular expression',
        description: `Optional. Filters the list matching vendor to the supplied regular expression`,
    },
    {
        name: 'name',
        alias: 'n',
        typeLabel: 'regular expression',
        description: `Optional. Filters the list matching network name to the supplied regular expression`,
    },
    { name: 'help', alias: 'h', type: Boolean, description: 'print this usage guide' },
];

const commandOptions: Partial<ICommandLineArgs> = commandLineArgs(args) as Partial<ICommandLineArgs>;

const options = { ...defaultOptions, ...commandOptions };

const nameRegExp = options.name ? new RegExp(options.name) : undefined;
const vendorRegExp = options.vendor ? new RegExp(options.vendor) : undefined;

function scanIps() {
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

    const vendorStream = ipStream.pipe(
        toArray(),
        combineLatest(defer(() => from(getTable()))),
        mergeMap(([responses, arpTable]) => getVendors(responses, arpTable), 1),
        share(),
    );

    let ipCount = 0;

    ipStream.pipe().subscribe(() => logProgress(++ipCount));
    vendorStream
        .pipe(scan((all, vendor) => [...all, vendor], new Array<IIpVendor>()))
        .subscribe((vendors) => logProgress(ipCount, vendors));

    vendorStream
        .pipe(
            filter((ip) => (vendorRegExp != null ? vendorRegExp.test(ip.vendor) : true)),
            toArray(),
        )
        .subscribe((vendors) => printResultsTable(vendors));
}

if (options.help) {
    const sections: Section[] = [
        {
            header: 'IP Vendor Scanner',
            content: 'Scans a range of IP addresses and returns a list of network names and vendors',
        },
        {
            header: 'Options',
            optionList: args,
        },
    ];

    console.log(commandLineUsage(sections));
} else {
    scanIps();
}
