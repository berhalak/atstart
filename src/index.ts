import fs from "then-fs"
import path from "path"


class File {
	async read(): Promise<string> {
		throw new Error("Method not implemented.");
	}

	constructor(public path: string) {

	}

	get name(): string {
		return path.basename(this.path);
	}

	get namePart(): string {
		if (!this.path) return null;
		return path.parse(this.path).name;
	}
}

class Script extends File {
	constructor(private folder: string, private files: File[]) {
		super(path.join(folder, "_start.ts"));
	}

	async read(): Promise<string> {
		let s = "// genarated by atstart\r\n";
		for (let f of this.files) {
			const relative = path.relative(this.folder, f.path);
			s += `import "./${relative.replace(/\\/g, '/')}"\r\n`;
		}
		return s;
	}
}

class Directory {
	async visitFiles(visitor: (file: File) => Promise<boolean>) {
		const files = await fs.readdir(this.path);
		let goDeep = true;
		for (let fileName of files) {
			const filePath = path.join(this.path, fileName);
			const stat = await fs.stat(filePath);
			if (stat.isFile()) {
				if (!await visitor(new File(filePath))) {
					goDeep = false;
				}
			}
		}

		if (!goDeep) return;

		for (let fileName of files) {
			const filePath = path.join(this.path, fileName);
			const stat = await fs.stat(filePath);
			if (stat.isDirectory()) {
				const subDir = new Directory(filePath);
				await subDir.visitFiles(visitor);
			}
		}
	}

	async writeFile(file: File) {
		await fs.writeFile(file.name, await file.read());
	}

	constructor(private path: string) {

	}
}

export class Generator {
	async write(folder: string) {
		await this.clear(folder);
		let dir = new Directory(folder);
		let startups: File[] = [];
		await dir.visitFiles(async file => {
			if (this.isStartup(file)) {
				startups.push(file);
				return false;
			}
			if (this.isInit(file)) {
				startups.push(file);
			}
			return true;
		});
		let script = new Script(folder, startups);
		await dir.writeFile(script);
	}

	private clear(folder: string) {
		["ts", "js"].forEach(e => {
			const file = path.join(folder, "_start." + e);
			if (fs.existsSync(file))
				fs.unlinkSync(file);
		});
	}

	isInit(file: File) {
		return file.namePart == "_init";
	}

	isStartup(file: File) {
		return file.namePart == "_start";
	}
}
