import { PingResponse } from "ping";

export interface ICommandLineArgs {
    range: string;
    name?: string;
    vendor?: string;
}

export interface IIpVendor extends PingResponse {
    vendor: string;
}
