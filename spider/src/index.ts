import { Octokit } from "octokit";
import dotenv from "dotenv";
import { writeFileSync } from "fs";
import { writeFile } from "fs/promises";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.TOKEN,
});

interface OsModuleConfig {
  name: string;
  description: string;
  version: string;
  keywords: string[];
  author: {
    name: string;
    email: string;
    url: string | undefined;
  }[];
  // repo url
  url: string;
  created_at: string | null | undefined;
  updated_at: string | null | undefined;
  repo: string;
}

interface PerRepoInfo {
  repo: string;
  create_at: string | null | undefined;
  update_at: string | null | undefined;
  content: string;
  url: string;
}

// entry point
async function main() {
  let rate_limit = await octokit.rest.rateLimit.get();
  // console.log(`rate_limit: ${rate_limit.data.rate.limit}`);
  console.log(rate_limit.data);
  let orgs = await octokit.rest.repos.listForOrg({
    org: "Byte-OS",
  });
  console.log(orgs);

  let modules: Array<PerRepoInfo> = new Array();

  // Get all files content
  await Promise.all(orgs.data.map(async ({ 
    name, full_name, owner, created_at, updated_at,
    html_url
  }) => {
    console.log(`get ${full_name}`);
    let content = await octokit.rest.repos.getContent({
      owner: owner.login,
      repo: name,
      path: "README.json",
    }).then(result => (result.data as any)['content']).catch(() => null);
    // Insert config into map if file content is not null.
    if (content != null) {
      console.log(`insert into ${full_name}`)
      modules.push({
        content: Buffer.from(content, "base64").toString('utf-8'),
        repo: full_name,
        create_at: created_at,
        update_at: updated_at,
        url: html_url
      });
    }
  }));
  let module_configs = modules.map(perRepo => {
    let module_config = JSON.parse(perRepo.content) as OsModuleConfig;
    module_config.url = perRepo.url;
    module_config.repo = perRepo.repo;
    module_config.created_at = perRepo.create_at;
    module_config.updated_at = perRepo.update_at;
    return module_config;
  });
  await writeFile("../web/data.json", JSON.stringify(module_configs, null, 2));
}

// call entry point
main();
