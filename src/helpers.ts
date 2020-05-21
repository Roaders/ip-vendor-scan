import { NetworkInterfaceInfo, networkInterfaces } from 'os';
import { from, Observable, of, interval } from 'rxjs';
import { map, catchError, mergeMap, tap, take } from 'rxjs/operators';
import { IIpVendor, ICommandLineArgs } from './contracts';
import { stdout } from 'single-line-log';
import { IArpTableRow, IArpTable } from '@network-utils/arp-lookup';
import { PingResponse } from 'ping';
import { promises as dnsPromises } from 'dns';
import fetch from 'node-fetch';
import Table from 'cli-table';

const macLookupDelay = 1100;
let lastMacLookup = 0;

export function verifyRange(range: string): boolean {
    //https://regex101.com/r/6lYGos/1
    const rangeRegExp = /^(((\d{1,3})|(\[\d{1,3}\-\d{1,3}\]))\.){3}((\d{1,3})|(\[\d{1,3}\-\d{1,3}\]))$/;

    return rangeRegExp.test(range);
}

function getLocalAddresses(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>) {
    return Object.keys(interfaces).reduce(
        (all, current) => [...all, ...interfaces[current]!],
        new Array<NetworkInterfaceInfo>(),
    );
}

export function getDefaultRange(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>): string {
    const currentAddress =
        getLocalAddresses(interfaces)
            .filter((iface) => iface.family === 'IPv4' && !iface.internal)
            .map((iface) => iface.address)[0] || '192.168.0.1';

    const addressSegments = currentAddress.split('.');
    addressSegments.pop();

    return `${addressSegments.join('.')}.[0-255]`;
}

function expandSegment(segment: string): number[] {
    const rangeRegExp = /^\[(\d{1,3})-(\d{1,3})\]/;
    const rangeResult = rangeRegExp.exec(segment);
    if (rangeResult != null) {
        const start = parseInt(rangeResult[1]);
        const end = parseInt(rangeResult[2]);
        return Array.from({ length: end - start + 1 }).map((_, index) => index + start);
    }
    return [parseInt(segment)];
}

export function expandRange(range: string) {
    const segmentRanges = range.split('.').map(expandSegment);

    const ips: string[] = [];

    segmentRanges[0].forEach((segmentOne) => {
        segmentRanges[1].forEach((segmentTwo) => {
            segmentRanges[2].forEach((segmentThree) => {
                segmentRanges[3].forEach((segmentFour) => {
                    ips.push(`${segmentOne}.${segmentTwo}.${segmentThree}.${segmentFour}`);
                });
            });
        });
    });

    return ips;
}

function nonWhitespaceText(value: any): value is string {
    return typeof value === 'string' && value != '';
}

export function printWelcomeMessage(args: ICommandLineArgs) {
    const matchText = [
        args.name ? `names matching '${args.name}'` : undefined,
        args.vendor ? `vendors matching '${args.vendor}'` : undefined,
    ]
        .filter(nonWhitespaceText)
        .join(' and ');

    return [`Scanning IP range '${args.range}'`, matchText].filter(nonWhitespaceText).join(' for ');
}

export function getIpName(response: PingResponse): Observable<PingResponse> {
    return from(dnsPromises.reverse(response.host)).pipe(
        catchError(() => of([])),
        map((names) => ({ ...response, host: names[0] || 'name not found', numeric_host: response.host })),
    );
}

export function getLookupDelay(lastLookup: number, now: number) {
    const elapsed = now - lastLookup;
    return Math.max(macLookupDelay - elapsed, 0);
}

function lookupMacAddress(mac?: string): Observable<string> {
    if (mac == null) {
        return of(`Unknown`);
    }

    const lookupDelay = getLookupDelay(lastMacLookup, Date.now());

    return interval(lookupDelay).pipe(
        take(1),
        mergeMap(() => {
            lastMacLookup = Date.now();
            return from(fetch(`https://api.macvendors.com/${encodeURIComponent(mac)}`));
        }),
        tap((response) => {
            if (response.status === 404) {
                throw new Error(`404`);
            }
        }),
        mergeMap((response) => response.text()),
        catchError(() => of(`Unknown (${mac})`)),
    );
}

function getLocalRow(response: PingResponse): IArpTableRow | undefined {
    return getLocalAddresses(networkInterfaces())
        .filter((iface) => iface.address === response.numeric_host)
        .map<IArpTableRow>((iface) => ({ ip: iface.address, mac: iface.mac, type: 'unknown', vendor: '' }))[0];
}

function getVendor(response: PingResponse, arpTable: IArpTable): Observable<IIpVendor> {
    let row: IArpTableRow | undefined = arpTable.filter((row) => row.ip === response.numeric_host)[0];

    if (row == null) {
        row = getLocalRow(response);
    }
    const vendor = nonWhitespaceText(row?.vendor) ? row?.vendor : undefined;
    const vendorStream = vendor ? of(vendor) : lookupMacAddress(row?.mac);

    return vendorStream.pipe(map((vendor) => ({ ...response, vendor })));
}

export function getVendors(responses: PingResponse[], arpTable: IArpTable): Observable<IIpVendor> {
    return from(responses).pipe(mergeMap((response) => getVendor(response, arpTable), 1));
}

export function printResultsTable(vendors: IIpVendor[]) {
    console.log('');

    const table = new Table({ head: ['Address', 'Names', 'Vendor'] });
    table.push(...vendors.map((vendor) => [vendor.numeric_host, vendor.host, vendor.vendor]));

    console.log(table.toString());
}

export function logProgress(count: number, vendors?: IIpVendor[]) {
    const vendorString = vendors
        ? `\n${vendors.length} vendors Loaded...\n(Loading Vendors is slow as we can only make 1 request per second from https://macvendors.com/api)`
        : ``;
    stdout(`${count} IP Addresses Found...${vendorString}`);
}
