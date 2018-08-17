'use strict';

import * as vscode from 'vscode';
import axios from 'axios';
import { PackageNodeProvider } from './package';

export async function activate(context: vscode.ExtensionContext) {
    vscode.commands.executeCommand('setContext', 'supportsNuget', true);

    let registrationUri = '';
    try {
        const indexResponse = await axios.get('https://api.nuget.org/v3555/index.json');
        const registrationResource = indexResponse.data.resources.find((x: any) => x['@type'] === 'RegistrationsBaseUrl/3.6.0');
        registrationUri = registrationResource['@id'] as string;
    } catch {
        throw new Error('Unable to connect to NuGet API - please check your network connection');
    }

    const provider = new PackageNodeProvider(registrationUri);
    vscode.window.registerTreeDataProvider('nugetPackages', provider);
    vscode.commands.registerCommand('nugetPackages.refresh', () => provider.refresh());
}