// Employee identity for the header. The canonical source (main-world
// activeUserProfile) isn't reachable from the content-script world, but the same
// "[811175] SURNAME, First" string is in the site DOM (.empName / #empInfo).
import { computed } from "vue";

export function useIdentity() {
  return computed(() => {
    // Dev standalone has no site DOM — use a fixed test user.
    if (import.meta.env.DEV) return { id: "101100", name: "Test Employee", initials: "TE" };
    const src = document.querySelector(".empName") || document.getElementById("empInfo");
    const text = (src && src.textContent) || "";
    const idm = text.match(/\[(\d+)\]/);
    const id = idm ? idm[1] : "";
    let name = text.replace(/^.*?\]\s*/, "").trim();
    if (!name) name = text.trim();
    const parts = name.split(",").map((s) => s.trim());
    const surname = parts[0] || "", first = parts[1] || "";
    const initials = ((first[0] || "") + (surname[0] || "")).toUpperCase() || (id ? id.slice(0, 2) : "··");
    return { id, name: name || "—", initials };
  });
}
