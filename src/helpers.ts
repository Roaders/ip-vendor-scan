import { NetworkInterfaceInfo } from 'os';
import { from, of, Observable } from 'rxjs';
import { promises as dnsPromises } from 'dns';
import { catchError, map } from 'rxjs/operators';
import { IIPNames, IIpVendor } from './contracts';
import { stdout } from 'single-line-log';
import { getTable } from '@network-utils/arp-lookup';

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

export function getIpName(address: string): Observable<IIPNames> {
    return from(dnsPromises.reverse(address)).pipe(
        catchError(() => of(['no name'])),
        map((names) => ({ address, names })),
    );
}

export function getVendor(ip: IIPNames): Observable<IIpVendor> {
    return from(getTable()).pipe(
        map((table) => table.filter((row) => row.ip === ip.address)[0]),
        map((row) => (row != null ? row.vendor : `Unknown`)),
        map((vendor) => ({ ...ip, vendor })),
    );
}

export function logProgress(count: number) {
    stdout(`${count} IP Addresses Found...`);
}
