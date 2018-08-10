'use strict';

import * as vscode from 'vscode';
import axios from 'axios';
import { PackageNodeProvider } from './package';

export async function activate(context: vscode.ExtensionContext) {
    vscode.commands.executeCommand('setContext', 'supportsNuget', true);

    //TODO: wrap this better
    const indexResponse = await axios.get('https://api.nuget.org/v3/index.json');
    const registrationResource = indexResponse.data.resources.find((x: any) => x['@type'] === 'RegistrationsBaseUrl/3.6.0');
    
    const provider = new PackageNodeProvider(registrationResource['@id'] as string);
    vscode.window.registerTreeDataProvider('nugetPackages', provider);
    vscode.commands.registerCommand('nugetPackages.refresh', () => provider.refresh());
}