import { readFileSync } from 'fs';
import { basename } from 'path';
import * as vscode from 'vscode';
import * as xml from 'xml-js';
import axios from 'axios';
import intervalParse from './interval';
import { Dependency, DependencyMetadata } from './metadata';
import { Node, ProjectNode, DependencyNode, PackageNode } from './node';

export class PackageNodeProvider implements vscode.TreeDataProvider<Node> {
    constructor(
        private registrationUri: string
    ) { }

    private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined> = new vscode.EventEmitter<Node | undefined>();
    onDidChangeTreeData: vscode.Event<Node | null | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Node | undefined): vscode.ProviderResult<Node[]> {
        return new Promise((resolve, reject) => {
            if (element instanceof ProjectNode) {
                this.getProjectPackages(element as ProjectNode)
                    .then(packages => {
                        this.orderByName(packages);
                        resolve(packages);
                    })
                    .catch(reject);
            } else if (element instanceof PackageNode || element instanceof DependencyNode) {
                this.getPackageDependencies(element)
                    .then(dependencies => {
                        this.orderByName(dependencies);
                        resolve(dependencies);
                    })
                    .catch(reject);
            } else {
                this.getProjects()
                    .then(projects => resolve(projects))
                    .catch(reject);
            }
        });
    }

    private orderByName(dependencies: DependencyNode[]) {
        dependencies.sort((a: any, b: any) => {
            var _a = a.name.toLowerCase();
            var _b = b.name.toLowerCase();
            if (_a < _b) { return -1; }
            if (_a > _b) { return 1; }
            return 0;
        });
    }

    private getFramework(node: Node): string {
        return node instanceof ProjectNode
            ? (node as ProjectNode).framework
            : this.getFramework((node as DependencyNode).parent);
    }

    private async getProjects(): Promise<ProjectNode[]> {
        const projectFiles = await vscode.workspace.findFiles('**/*.csproj');
        return projectFiles.length
            ? projectFiles.map(uri => new ProjectNode(
                basename(uri.path, '.csproj'),
                uri.path,
                xml.xml2js(readFileSync(uri.path, 'utf8'), { compact: true }) as any,
                vscode.TreeItemCollapsibleState.Collapsed))
            : [];
    }

    private async getProjectPackages(project: ProjectNode): Promise<PackageNode[]> {
        const itemGroups = project.content.Project.ItemGroup.length
            ? project.content.Project.ItemGroup
            : [project.content.Project.ItemGroup];

        const packages = itemGroups.reduce((current: any[], ig: any) => {
            if (ig.PackageReference) {
                ig.PackageReference.forEach((x: any) => current.push({
                    name: x._attributes.Include,
                    version: x._attributes.Version
                }));
            } else if (ig.DotNetCliToolReference) {
                ig.DotNetCliToolReference.forEach((x: any) => current.push({
                    name: x._attributes.Include,
                    version: x._attributes.Version
                }));
            }

            return current;
        }, []);

        return Promise.all(packages.map(async (p: any) => {
            const metadata = await this.getDependencyMetadata(p.name, p.version, project.framework);
            return new PackageNode(p.name, p.version, metadata, project);
        }) as PackageNode[]);
    }

    private async getPackageDependencies(dep: DependencyNode): Promise<DependencyNode[]> {
        return Promise.all(dep.metadata.dependencies.map(async (d: Dependency) => {
            const framework = this.getFramework(dep);
            const metadata = await this.getDependencyMetadata(d.name, d.version, framework);
            return new DependencyNode(d.name, d.version, metadata, dep);
        }));
    }

    private async getDependencyMetadata(name: string, version: string, framework: string): Promise<DependencyMetadata> {
        const catalogResponse = await axios.get(`${this.registrationUri}${name.toLowerCase()}/index.json`);
        if (catalogResponse.data.count >= 1) {
            const catalog = catalogResponse.data.items.find((i: any) => i.upper >= version && i.lower <= version);
            if (catalog) {
                if (!catalog.items) {
                    const catalogPageResponse = await axios.get(catalog['@id']);
                    const catalogItem = catalogPageResponse.data.items.find((i: any) => i.catalogEntry.version === version);

                    // TODO: reconcile framework
                    const deps = catalogItem.catalogEntry.dependencyGroups
                        ? catalogItem.catalogEntry.dependencyGroups[0].dependencies || []
                        : [];

                    return new DependencyMetadata(
                        catalogPageResponse.data.items
                            .map((i: any) => i.catalogEntry.version)
                            .filter((v: string) => v >= version),
                        deps.map((d: any) => {
                            const interval = intervalParse(d.range);
                            return new Dependency(d.id, interval ? interval.from.value.toString() : '?');
                        })
                    );
                }
                else {
                    const allItems = catalogResponse.data.items.reduce((current: any, i: any) => current.concat(i.items), []);
                    const catalogItem = allItems.find((i: any) => i.catalogEntry.version === version);

                    // TODO: reconcile framework
                    const deps = catalogItem.catalogEntry.dependencyGroups
                        ? catalogItem.catalogEntry.dependencyGroups[0].dependencies || []
                        : [];

                    return new DependencyMetadata(
                        allItems.map((i: any) => i.catalogEntry.version).filter((v: string) => v >= version),
                        deps.map((d: any) => {
                            const interval = intervalParse(d.range);
                            return new Dependency(d.id, interval ? interval.from.value.toString() : '?');
                        })
                    );
                }
            }
        }

        return new DependencyMetadata([], []);
    }
}