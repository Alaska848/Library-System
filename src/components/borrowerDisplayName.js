import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

/** Resolve display name from Firestore (student or doctor profile). */
export async function getBorrowerDisplayName(uid, fallbackEmail) {
  const st = await getDoc(doc(db, "students", uid));
  const stName = st.exists() ? st.data()?.name : null;
  if (stName) return stName;
  const dr = await getDoc(doc(db, "doctors", uid));
  const drName = dr.exists() ? dr.data()?.name : null;
  if (drName) return drName;
  return fallbackEmail || "User";
}
