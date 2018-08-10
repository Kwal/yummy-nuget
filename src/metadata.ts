export class Dependency {
    constructor(
        public readonly name: string,
        public readonly version: string
    ) { }
}

export class DependencyMetadata {
    constructor(
        public readonly versions: string[],
        public readonly dependencies: Dependency[]
    ) { }
}