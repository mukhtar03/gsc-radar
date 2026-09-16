"use server";

import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeGSCData, GSCRow } from "@/lib/seo-analyzer";

async function getGSCClient() {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    throw new Error("Unauthorized. Please log in first.");
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: session.accessToken });

  return google.searchconsole({ version: "v1", auth });
}

export async function getVerifiedSites() {
  const gsc = await getGSCClient();
  const response = await gsc.sites.list();
  const sites = response.data.siteEntry || [];
  
  return sites
    .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => s.siteUrl as string);
}

export async function runSiteAudit(siteUrl: string) {
  const gsc = await getGSCClient();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 90);

  const formattedStart = startDate.toISOString().split("T")[0];
  const formattedEnd = endDate.toISOString().split("T")[0];

  const response = await gsc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: formattedStart,
      endDate: formattedEnd,
      dimensions: ["query", "page"],
      rowLimit: 5000,
    },
  });

  const rows = (response.data.rows || []) as GSCRow[];
  return analyzeGSCData(rows);
}
