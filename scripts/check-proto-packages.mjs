import path from "node:path";
import { access, readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const showPaths = process.argv.includes("--paths");
const installedOnly = process.argv.includes("--installed");
const configuredProtoRoot = process.env.HAZEORIN_PROTO_ROOT?.trim();
const siblingProtoRoot = path.resolve(repoRoot, "..", "HaZeorin-Proto", "proto");

const packages = [
  {
    name: "@hazeorin/approvalflow-proto",
    packageRoot: "node_modules/@hazeorin/approvalflow-proto/proto",
    entryFile: "approvalflow/v1/approvalflow.proto"
  },
  {
    name: "@hazeorin/auth-proto",
    packageRoot: "node_modules/@hazeorin/auth-proto/proto",
    entryFile: "auth/v1/auth.proto"
  },
  {
    name: "@hazeorin/reporting-proto",
    packageRoot: "node_modules/@hazeorin/reporting-proto/proto",
    entryFile: "reporting/v1/reporting.proto"
  },
  {
    name: "@hazeorin/subscription-proto",
    packageRoot: "node_modules/@hazeorin/subscription-proto/proto",
    entryFile: "subscription/v1/subscription.proto"
  },
  {
    name: "@hazeorin/tenant-proto",
    packageRoot: "node_modules/@hazeorin/tenant-proto/proto",
    entryFile: "tenant/v1/tenant.proto"
  }
];

async function exists(relativePath) {
  try {
    const targetPath = path.isAbsolute(relativePath)
      ? relativePath
      : path.join(repoRoot, relativePath);
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function buildCandidateRoots(packageRoot) {
  return [
    configuredProtoRoot || null,
    siblingProtoRoot,
    path.join(repoRoot, packageRoot)
  ].filter(Boolean);
}

async function listProtoFiles(rootDir, prefix = "") {
  const targetDir = path.join(rootDir, prefix);
  const entries = await readdir(targetDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? path.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await listProtoFiles(rootDir, relativePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".proto")) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function compareInstalledPackage(pkg, installedRoot, sourceRoot) {
  const moduleName = pkg.entryFile.split("/")[0];
  const expectedFiles = [
    ...(await listProtoFiles(sourceRoot, "common")),
    ...(await listProtoFiles(sourceRoot, moduleName))
  ];

  for (const relativeFile of expectedFiles) {
    const sourceFile = path.join(sourceRoot, relativeFile);
    const installedFile = path.join(installedRoot, relativeFile);

    if (!(await exists(installedFile))) {
      throw new Error(`missing installed file ${installedFile}`);
    }

    const [sourceContent, installedContent] = await Promise.all([
      readFile(sourceFile, "utf8"),
      readFile(installedFile, "utf8")
    ]);

    if (sourceContent !== installedContent) {
      throw new Error(`installed proto differs from source at ${relativeFile}`);
    }
  }
}

async function resolveSourceRoot(pkg, installedRoot) {
  const candidateRoots = buildCandidateRoots(pkg.packageRoot).filter(
    (candidateRoot) => candidateRoot !== installedRoot
  );

  for (const candidateRoot of candidateRoots) {
    if (await exists(path.join(candidateRoot, pkg.entryFile))) {
      return candidateRoot;
    }
  }

  return null;
}

async function main() {
  let hasMissing = false;

  for (const pkg of packages) {
    const installedRoot = path.join(repoRoot, pkg.packageRoot);

    if (installedOnly) {
      if (!(await exists(path.join(installedRoot, pkg.entryFile)))) {
        hasMissing = true;
        console.error(`missing installed ${pkg.name}`);
        console.error(`  checked: ${path.join(installedRoot, pkg.entryFile)}`);
        continue;
      }

      const resolvedSourceRoot = await resolveSourceRoot(pkg, installedRoot);

      if (resolvedSourceRoot) {
        try {
          await compareInstalledPackage(pkg, installedRoot, resolvedSourceRoot);
        } catch (error) {
          hasMissing = true;
          console.error(`stale installed ${pkg.name}`);
          console.error(`  source:    ${resolvedSourceRoot}`);
          console.error(`  installed: ${installedRoot}`);
          console.error(`  reason:    ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
      }

      console.log(`ok installed ${pkg.name}`);
      if (showPaths) {
        console.log(`  source:    ${resolvedSourceRoot ?? "(not found)"}`);
        console.log(`  installed: ${installedRoot}`);
      }
      continue;
    }

    const candidateRoots = buildCandidateRoots(pkg.packageRoot);
    let resolvedRoot = null;

    for (const candidateRoot of candidateRoots) {
      if (await exists(path.join(candidateRoot, pkg.entryFile))) {
        resolvedRoot = candidateRoot;
        break;
      }
    }

    if (!resolvedRoot) {
      hasMissing = true;
      console.error(`missing ${pkg.name}`);
      for (const candidateRoot of candidateRoots) {
        console.error(`  checked: ${path.join(candidateRoot, pkg.entryFile)}`);
      }
      continue;
    }

    console.log(`ok ${pkg.name}`);
    if (showPaths) {
      console.log(`  include: ${resolvedRoot}`);
      console.log(`  entry:   ${path.join(resolvedRoot, pkg.entryFile)}`);
    }
  }

  if (hasMissing) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
