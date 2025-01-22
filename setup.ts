const requiredPermissions = [
  "read",
  "write",
  "net",
  "env",
  "run",
] as const;

const dependencies = [
  {
    name: "oak",
    url: "https://deno.land/x/oak@v11.1.0/mod.ts",
  },
  {
    name: "sqlite",
    url: "https://deno.land/x/sqlite@v3.8/mod.ts",
  },
  {
    name: "dotenv",
    url: "https://deno.land/std@0.208.0/dotenv/mod.ts",
  },
  {
    name: "djwt",
    url: "https://deno.land/x/djwt@v2.9.1/mod.ts",
  },
  {
    name: "path",
    url: "https://deno.land/std@0.208.0/path/mod.ts",
  },
  {
    name: "fs",
    url: "https://deno.land/std@0.208.0/fs/mod.ts",
  },
];

async function checkPermissions() {
  console.log("🔒 Checking Deno permissions...");
  
  for (const permission of requiredPermissions) {
    const status = await Deno.permissions.query({ name: permission as Deno.PermissionName });
    if (status.state === "prompt" || status.state === "denied") {
      console.error(`❌ Missing '${permission}' permission. Please run with --allow-${permission}`);
      Deno.exit(1);
    }
  }
  
  console.log("✅ All required permissions are granted");
}

async function checkDependencies() {
  console.log("\n📦 Checking dependencies...");
  
  for (const dep of dependencies) {
    try {
      console.log(`Checking ${dep.name}...`);
      await import(dep.url);
      console.log(`✅ ${dep.name} is available`);
    } catch (error) {
      console.error(`❌ Failed to load ${dep.name}: ${error.message}`);
      console.log(`Attempting to cache ${dep.name}...`);
      
      try {
        const process = new Deno.Command("deno", {
          args: ["cache", dep.url],
        });
        const { code } = await process.output();
        
        if (code === 0) {
          console.log(`✅ Successfully cached ${dep.name}`);
        } else {
          console.error(`❌ Failed to cache ${dep.name}`);
          Deno.exit(1);
        }
      } catch (error) {
        console.error(`❌ Failed to cache ${dep.name}: ${error.message}`);
        Deno.exit(1);
      }
    }
  }
}

async function checkEnvironment() {
  console.log("\n🔧 Checking environment...");
  
  // Check backend directory
  const backendDir = "./backend";
  try {
    const stat = await Deno.stat(backendDir);
    if (!stat.isDirectory) {
      throw new Error("backend is not a directory");
    }
    console.log("✅ backend directory exists");
  } catch {
    console.log("⚠️  Creating backend directory...");
    await Deno.mkdir(backendDir);
    console.log("✅ Created backend directory");
  }

  // Check if .env exists in backend directory
  const envPath = "./backend/.env";
  try {
    await Deno.stat(envPath);
    console.log("✅ .env file exists in backend directory");
  } catch {
    console.log("⚠️  .env file not found in backend directory, creating from template...");
    const envContent = `ADMIN_PASSWORD=admin
JWT_SECRET=your-super-secret-jwt-key-8675309
`;
    
    try {
      await Deno.writeTextFile(envPath, envContent);
      console.log("✅ Created .env file in backend directory");
    } catch (error) {
      console.error("❌ Failed to create .env file:", error.message);
      Deno.exit(1);
    }
  }
}

async function main() {
  console.log("🚀 Starting setup...\n");
  
  await checkPermissions();
  await checkDependencies();
  await checkEnvironment();
  
  console.log("\n✨ Setup complete! You can now run the application with:");
  console.log("deno task dev");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Setup failed:", error);
    Deno.exit(1);
  });
}
