import * as vscode from 'vscode';
import { DependencyMetadata } from './metadata';

export class Node extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(name, collapsibleState);
    }
}

export class ProjectNode extends Node {
    constructor(
        name: string,
        public readonly path: string,
        public readonly content: any,
        collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(name, collapsibleState);
    }

    get framework(): string {
        if (this.content.Project.PropertyGroup.TargetFramework) {
            return this.content.Project.PropertyGroup.TargetFramework._text;
        }

        throw new Error('Extension only supports single target framework');
    }

    contextValue = 'project';
}

export class DependencyNode extends Node {
    constructor(
        name: string,
        public readonly version: string,
        public readonly metadata: DependencyMetadata,
        public readonly parent: Node
    ) {
        super(name, metadata.dependencies.length
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None);

        this.label = `${name} (${version})`;
    }

    contextValue = 'dependency';
}

export class PackageNode extends DependencyNode {
    constructor(
        name: string,
        version: string,
        metadata: DependencyMetadata,
        project: ProjectNode,
        public readonly command?: vscode.Command
    ) {
        super(name, version, metadata, project);
        this.label = `${this.hasUpdate ? '*' : ''}${name} (${version})`;
    }

    get hasUpdate(): boolean {
        return this.metadata.versions ? this.metadata.versions.some((v: any) => v > this.version) : false;
    }

    contextValue = 'package';
}