import { redirect } from "next/navigation";

/**
 * /company-profile is consolidated into the canonical Company Settings page.
 * Kept as a permanent redirect so existing links keep working.
 */
export default function CompanyProfileRedirect() {
  redirect("/account/company");
}
