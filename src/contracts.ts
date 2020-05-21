export interface ICommandLineArgs {
    range: string;
    name?: string;
    vendor?: string;
}

export interface IIPNames {
    address: string;
    names: string[];
}

export interface IIpVendor extends IIPNames {
    vendor: string;
}
