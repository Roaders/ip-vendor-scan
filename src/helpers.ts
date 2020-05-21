import { NetworkInterfaceInfo } from 'os';
import { from, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IIpVendor, ICommandLineArgs } from './contracts';
import { stdout } from 'single-line-log';
import { IArpTableRow, IArpTable } from '@network-utils/arp-lookup';
import { PingResponse } from 'ping';
import { promises as dnsPromises } from 'dns';

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

function getVendor(response: PingResponse, arpTable: IArpTable): IIpVendor {
    const row: IArpTableRow | undefined = arpTable.filter((row) => row.ip === response.numeric_host)[0];
    const vendor = row ? row.vendor : `Unknown`;

    return { ...response, vendor };
}

export function getVendors(responses: PingResponse[], arpTable: IArpTable): Observable<IIpVendor> {
    return from(responses).pipe(map((response) => getVendor(response, arpTable)));
}

export function logProgress(count: number) {
    stdout(`${count} IP Addresses Found...`);
}
