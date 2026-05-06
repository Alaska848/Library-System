import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  doc, getDoc, getDocs, updateDoc,
  collection, query, where,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// ─── Alert ────────────────────────────────────────────────────────────────────
function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const c = { success:{ bg:"#dcfce7",border:"#16a34a",text:"#15803d" }, error:{ bg:"#fee2e2",border:"#ef4444",text:"#b91c1c" }, info:{ bg:"#eff6ff",border:"#3b82f6",text:"#1d4ed8" } }[type] || { bg:"#eff6ff",border:"#3b82f6",text:"#1d4ed8" };
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.text, borderRadius:10, padding:"10px 16px", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:c.text,fontSize:16,lineHeight:1 }}>×</button>
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, value }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,color:"#374151",fontSize:14 }}>
      <i className={icon} style={{ color:"#9ca3af",width:18,textAlign:"center" }} />
      <span>{value}</span>
    </div>
  );
}

// ─── BookCard ─────────────────────────────────────────────────────────────────
function BookCard({ book }) {
  return (
    <div style={{ background:"#fdf9f6",borderRadius:12,padding:"14px 16px",border:"1px solid #f0ece6",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width:52,height:70,borderRadius:6,flexShrink:0,background:"linear-gradient(135deg,#9e734a,#633a19)",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <i className="fa-solid fa-book-open" style={{ color:"rgba(255,255,255,0.7)",fontSize:18 }} />
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:700,fontSize:15,color:"#1f2937",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{book.title}</div>
        <div style={{ fontSize:13,color:"#6b7280",marginBottom:6 }}>{book.author || "—"}</div>
        {book.returnDate && (
          <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#6b7280" }}>
            <i className="fa-regular fa-calendar" />
            {" "}Return by: {new Date(book.returnDate?.seconds*1000).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
          </div>
        )}
      </div>
      <span style={{ background:"#dcfce7",color:"#16a34a",borderRadius:20,fontSize:12,fontWeight:700,padding:"3px 10px",flexShrink:0 }}>ACTIVE</span>
    </div>
  );
}

// ─── HistoryCard ──────────────────────────────────────────────────────────────
function HistoryCard({ book }) {
  return (
    <div style={{ background:"#fdf9f6",borderRadius:12,padding:"14px 16px",border:"1px solid #f0ece6",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width:52,height:70,borderRadius:6,flexShrink:0,background:"linear-gradient(135deg,#aaa,#666)",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <i className="fa-solid fa-book" style={{ color:"rgba(255,255,255,0.7)",fontSize:18 }} />
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:700,fontSize:15,color:"#1f2937",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{book.title}</div>
        <div style={{ fontSize:13,color:"#6b7280",marginBottom:4 }}>{book.author || "—"}</div>
        {book.returnedAt && (
          <div style={{ fontSize:12,color:"#9ca3af" }}>
            Returned: {new Date(book.returnedAt?.seconds*1000).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
          </div>
        )}
      </div>
      <span style={{ background:"#f3f4f6",color:"#6b7280",borderRadius:20,fontSize:12,fontWeight:700,padding:"3px 10px",flexShrink:0 }}>RETURNED</span>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ userData, authUser }) {
  const [tab, setTab]             = useState("email");
  const [newEmail, setNewEmail]   = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [emailAlert, setEmailAlert] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [curPass, setCurPass]     = useState("");
  const [newPass, setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passAlert, setPassAlert] = useState(null);
  const [passLoading, setPassLoading] = useState(false);
  const [showEP, setShowEP]   = useState(false);
  const [showCP, setShowCP]   = useState(false);
  const [showNP, setShowNP]   = useState(false);
  const [showCNP, setShowCNP] = useState(false);

  const tabBtn = (id, label, icon) => (
    <button onClick={() => setTab(id)} style={{
      padding:"9px 20px",borderRadius:8,border:"none",cursor:"pointer",
      fontWeight:600,fontSize:14,transition:"all 0.2s",
      background: tab===id ? "#633a19" : "transparent",
      color: tab===id ? "#fff" : "#6b7280",
    }}>
      <i className={`${icon} me-2`}/>{label}
    </button>
  );

  const inputStyle = { width:"100%",padding:"10px 14px",border:"1.5px solid #e5e7eb",borderRadius:10,fontSize:14,outline:"none",marginTop:6,fontFamily:"inherit" };
  const btnStyle   = { background:"#633a19",color:"#fff",border:"none",borderRadius:10,padding:"11px 28px",fontWeight:700,fontSize:14,cursor:"pointer" };

  const reauth = async (pw) => {
    const cred = EmailAuthProvider.credential(authUser.email, pw);
    await reauthenticateWithCredential(authUser, cred);
  };

  const handleEmailChange = async () => {
    if (!newEmail || !emailPass) { setEmailAlert({ type:"error",msg:"Please fill all fields." }); return; }
    setEmailLoading(true); setEmailAlert(null);
    try {
      await reauth(emailPass);
      await updateEmail(authUser, newEmail);
      await updateDoc(doc(db,"users",authUser.uid),{ email:newEmail });
      setEmailAlert({ type:"success",msg:"Email updated successfully! ✅" });
      setNewEmail(""); setEmailPass("");
    } catch(e) {
      const m = e.code==="auth/wrong-password"?"Wrong current password."
        : e.code==="auth/email-already-in-use"?"Email already in use."
        : e.code==="auth/invalid-email"?"Invalid email format."
        : e.message;
      setEmailAlert({ type:"error",msg:m });
    }
    setEmailLoading(false);
  };

  const handlePasswordChange = async () => {
    if (!curPass||!newPass||!confirmPass) { setPassAlert({ type:"error",msg:"Please fill all fields." }); return; }
    if (newPass!==confirmPass) { setPassAlert({ type:"error",msg:"New passwords don't match." }); return; }
    if (newPass.length<6) { setPassAlert({ type:"error",msg:"Password must be at least 6 characters." }); return; }
    setPassLoading(true); setPassAlert(null);
    try {
      await reauth(curPass);
      await updatePassword(authUser, newPass);
      setPassAlert({ type:"success",msg:"Password updated successfully! ✅" });
      setCurPass(""); setNewPass(""); setConfirmPass("");
    } catch(e) {
      setPassAlert({ type:"error",msg: e.code==="auth/wrong-password"?"Wrong current password.":e.message });
    }
    setPassLoading(false);
  };

  const pwField = (label, val, setVal, show, setShow) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:13,fontWeight:700,color:"#374151" }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input type={show?"text":"password"} value={val} onChange={e=>setVal(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`} style={{ ...inputStyle,paddingRight:42 }} />
        <button type="button" onClick={()=>setShow(s=>!s)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",padding:4 }}>
          <i className={show?"fa-solid fa-eye-slash":"fa-solid fa-eye"} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"28px 32px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:24 }}>
        <i className="fa-solid fa-gear" style={{ color:"#633a19",fontSize:18 }} />
        <span style={{ fontWeight:800,fontSize:20,color:"#1f2937" }}>Account Settings</span>
      </div>

      <div style={{ display:"flex",gap:8,marginBottom:28,background:"#f9f6f2",borderRadius:10,padding:6,width:"fit-content",flexWrap:"wrap" }}>
        {tabBtn("email",    "Change Email",    "fa-regular fa-envelope")}
        {tabBtn("password", "Change Password", "fa-solid fa-lock")}
        {tabBtn("danger",   "Privacy",         "fa-solid fa-shield-halved")}
      </div>

      {/* Email */}
      {tab==="email" && (
        <div style={{ maxWidth:460 }}>
          <Alert type={emailAlert?.type} msg={emailAlert?.msg} onClose={()=>setEmailAlert(null)} />
          <div style={{ background:"#f9f6f2",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10 }}>
            <i className="fa-regular fa-envelope" style={{ color:"#9ca3af" }} />
            <div>
              <div style={{ fontSize:11,color:"#9ca3af",fontWeight:600 }}>CURRENT EMAIL</div>
              <div style={{ fontSize:14,color:"#374151",fontWeight:600 }}>{userData?.email||authUser?.email}</div>
            </div>
          </div>
          <label style={{ fontSize:13,fontWeight:700,color:"#374151" }}>New Email Address</label>
          <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Enter new email" style={inputStyle} />
          <label style={{ fontSize:13,fontWeight:700,color:"#374151",marginTop:16,display:"block" }}>
            Current Password <span style={{ color:"#9ca3af",fontWeight:400 }}>(to confirm)</span>
          </label>
          <div style={{ position:"relative" }}>
            <input type={showEP?"text":"password"} value={emailPass} onChange={e=>setEmailPass(e.target.value)} placeholder="Enter current password" style={{ ...inputStyle,paddingRight:42 }} />
            <button type="button" onClick={()=>setShowEP(s=>!s)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",padding:4 }}>
              <i className={showEP?"fa-solid fa-eye-slash":"fa-solid fa-eye"} />
            </button>
          </div>
          <button onClick={handleEmailChange} disabled={emailLoading} style={{ ...btnStyle,marginTop:24,opacity:emailLoading?0.7:1 }}>
            {emailLoading?"Updating…":"Update Email"}
          </button>
        </div>
      )}

      {/* Password */}
      {tab==="password" && (
        <div style={{ maxWidth:460 }}>
          <Alert type={passAlert?.type} msg={passAlert?.msg} onClose={()=>setPassAlert(null)} />
          {pwField("Current Password",  curPass,     setCurPass,     showCP,  setShowCP)}
          {pwField("New Password",      newPass,     setNewPass,     showNP,  setShowNP)}
          {pwField("Confirm New Password", confirmPass, setConfirmPass, showCNP, setShowCNP)}
          <div style={{ background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400e",marginBottom:20 }}>
            <i className="fa-solid fa-circle-info me-2"/>Password must be at least 6 characters long.
          </div>
          <button onClick={handlePasswordChange} disabled={passLoading} style={{ ...btnStyle,opacity:passLoading?0.7:1 }}>
            {passLoading?"Updating…":"Update Password"}
          </button>
        </div>
      )}

      {/* Privacy */}
      {tab==="danger" && (
        <div style={{ maxWidth:500 }}>
          <div style={{ background:"#fff5f5",border:"1px solid #fecaca",borderRadius:12,padding:"20px 24px" }}>
            <div style={{ fontWeight:700,fontSize:16,color:"#b91c1c",marginBottom:8 }}>
              <i className="fa-solid fa-triangle-exclamation me-2"/>Privacy & Data
            </div>
            <p style={{ fontSize:13,color:"#6b7280",marginBottom:16,lineHeight:1.6 }}>
              Your data is stored securely. To request account deletion or export your data, please contact library administration.
            </p>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {[{ icon:"fa-solid fa-download",label:"Export My Data",color:"#633a19" },
                { icon:"fa-solid fa-trash",   label:"Delete My Account",color:"#ef4444" }].map((b,i)=>(
                <button key={i} style={{ background:"transparent",border:`1.5px solid ${b.color}`,color:b.color,borderRadius:10,padding:"10px 20px",fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8,width:"fit-content" }}>
                  <i className={b.icon}/>{b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wishlist Panel ───────────────────────────────────────────────────────────
function WishlistPanel({ wishlist, onRemove }) {
  if (wishlist.length===0) return (
    <div style={{ background:"#fff",borderRadius:16,padding:"40px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",textAlign:"center",color:"#9ca3af" }}>
      <i className="fa-solid fa-heart" style={{ fontSize:36,marginBottom:14,display:"block" }}/>
      <p style={{ fontSize:15 }}>Your wishlist is empty</p>
      <Link to="/catalog" className="btn btn-sm rounded-pill px-4" style={{ background:"#633a19",color:"#fff",fontSize:13,textDecoration:"none" }}>Browse Catalog</Link>
    </div>
  );
  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"28px 32px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:24 }}>
        <i className="fa-solid fa-heart" style={{ color:"#633a19",fontSize:18 }}/>
        <span style={{ fontWeight:800,fontSize:20,color:"#1f2937" }}>My Wishlist</span>
        <span style={{ background:"rgba(99,58,25,0.1)",color:"#633a19",borderRadius:20,fontSize:12,fontWeight:700,padding:"2px 10px" }}>{wishlist.length}</span>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {wishlist.map((w,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,border:"1px solid #f0ece6",background:"#fdf9f6" }}>
            <div style={{ width:52,height:70,borderRadius:6,flexShrink:0,background:"linear-gradient(135deg,#9e734a,#633a19)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <i className="fa-solid fa-book" style={{ color:"rgba(255,255,255,0.7)",fontSize:18 }}/>
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:700,fontSize:15,color:"#1f2937" }}>{w.title}</div>
              <div style={{ fontSize:13,color:"#6b7280" }}>{w.author}</div>
              <div style={{ fontSize:12,fontWeight:600,marginTop:4,color:w.available?"#16a34a":"#f59e0b" }}>{w.available?"Available Now":"Not Available"}</div>
            </div>
            <div style={{ display:"flex",gap:8,flexShrink:0 }}>
              <Link to="/catalog" style={{ background:"#633a19",color:"#fff",borderRadius:8,fontSize:12,fontWeight:600,padding:"6px 14px",textDecoration:"none" }}>Borrow</Link>
              <button onClick={()=>onRemove(i)} style={{ background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,fontSize:12,fontWeight:600,padding:"6px 10px",cursor:"pointer" }}>
                <i className="fa-solid fa-trash"/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────
function HistoryPanel({ history }) {
  if (history.length===0) return (
    <div style={{ background:"#fff",borderRadius:16,padding:"40px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",textAlign:"center",color:"#9ca3af" }}>
      <i className="fa-solid fa-clock-rotate-left" style={{ fontSize:36,marginBottom:14,display:"block" }}/>
      <p style={{ fontSize:15 }}>No borrowing history yet</p>
    </div>
  );
  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"28px 32px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:24 }}>
        <i className="fa-solid fa-clock-rotate-left" style={{ color:"#633a19",fontSize:18 }}/>
        <span style={{ fontWeight:800,fontSize:20,color:"#1f2937" }}>Borrowing History</span>
        <span style={{ background:"rgba(99,58,25,0.1)",color:"#633a19",borderRadius:20,fontSize:12,fontWeight:700,padding:"2px 10px" }}>{history.length} books</span>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {history.map((b,i)=><HistoryCard key={i} book={b}/>)}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function UserProfile() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const [authUser,    setAuthUser]    = useState(null);
  const [userData,    setUserData]    = useState(null);
  const [borrowed,    setBorrowed]    = useState([]);
  const [history,     setHistory]     = useState([]);
  const [wishlist,    setWishlist]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("profile");
  const [photoURL,    setPhotoURL]    = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [photoAlert,  setPhotoAlert]  = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      setAuthUser(u);
      try {
        const snap = await getDoc(doc(db,"users",u.uid));
        const data = snap.exists() ? { uid:u.uid,email:u.email,...snap.data() } : { uid:u.uid,email:u.email };
        setUserData(data);
        if (data.photoURL) setPhotoURL(data.photoURL);
      } catch { setUserData({ uid:u.uid,email:u.email }); }

      try {
        const q = query(collection(db,"borrowings"),where("userId","==",u.uid),where("status","==","active"));
        const s = await getDocs(q);
        setBorrowed(s.docs.map(d=>({ id:d.id,...d.data() })));
      } catch {}

      try {
        const q2 = query(collection(db,"borrowings"),where("userId","==",u.uid),where("status","==","returned"));
        const s2 = await getDocs(q2);
        setHistory(s2.docs.map(d=>({ id:d.id,...d.data() })));
      } catch {}

      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file||!authUser) return;
    if (!file.type.startsWith("image/")) { setPhotoAlert({ type:"error",msg:"Please select an image file." }); return; }
    if (file.size>3*1024*1024) { setPhotoAlert({ type:"error",msg:"Image must be less than 3 MB." }); return; }
    setUploading(true); setPhotoAlert(null);
    try {
      const storage = getStorage();
      const storageRef = ref(storage,`profilePhotos/${authUser.uid}`);
      await uploadBytes(storageRef,file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db,"users",authUser.uid),{ photoURL:url });
      setPhotoURL(url);
      setPhotoAlert({ type:"success",msg:"Photo updated! ✅" });
    } catch { setPhotoAlert({ type:"error",msg:"Upload failed. Try again." }); }
    setUploading(false);
    e.target.value="";
  };

  const handleDeletePhoto = async () => {
    if (!authUser||!photoURL) return;
    setUploading(true);
    try {
      const storage = getStorage();
      await deleteObject(ref(storage,`profilePhotos/${authUser.uid}`));
      await updateDoc(doc(db,"users",authUser.uid),{ photoURL:null });
      setPhotoURL(null);
      setPhotoAlert({ type:"info",msg:"Photo removed." });
    } catch { setPhotoAlert({ type:"error",msg:"Could not delete photo." }); }
    setUploading(false);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div className="spinner-border" style={{ color:"#633a19" }} role="status"/>
    </div>
  );

  const displayName = userData?.name||userData?.displayName||userData?.email?.split("@")[0]||"User";
  const memberSince = userData?.createdAt
    ? new Date(userData.createdAt.seconds*1000).toLocaleDateString("en-US",{ month:"short",year:"numeric" })
    : "—";

  const SIDEBAR = [
    { icon:"fa-solid fa-gauge",             label:"Dashboard", action:()=>navigate("/home") },
    { icon:"fa-solid fa-user",              label:"Profile",   action:()=>setActiveTab("profile") },
    { icon:"fa-solid fa-book-open",         label:"My Books",  action:()=>navigate("/my-borrowed-books") },
    { icon:"fa-solid fa-heart",             label:"Wishlist",  action:()=>setActiveTab("wishlist") },
    { icon:"fa-solid fa-clock-rotate-left", label:"History",   action:()=>setActiveTab("history") },
    { icon:"fa-solid fa-gear",              label:"Settings",  action:()=>setActiveTab("settings") },
  ];

  const tabLabel = { profile:"Profile",wishlist:"Wishlist",history:"History",settings:"Settings" }[activeTab];

  return (
    <div style={{ minHeight:"100vh",background:"#f9f6f2",paddingTop:70 }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoChange}/>

      <div className="container-fluid" style={{ maxWidth:1200,padding:"32px 24px" }}>
        <div className="row g-4">

          {/* Sidebar */}
          <div className="col-12 col-md-3">
            <div style={{ background:"#fff",borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",position:"sticky",top:82 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24,paddingBottom:20,borderBottom:"1px solid #f0ece6" }}>
                <div style={{ width:48,height:48,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:"linear-gradient(135deg,#9e734a,#633a19)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {photoURL ? <img src={photoURL} alt="av" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <i className="fa-solid fa-user" style={{ color:"#fff",fontSize:18 }}/>}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:"#1f2937",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{displayName}</div>
                  <div style={{ fontSize:12,color:"#9ca3af" }}>ID: {userData?.uid?.slice(0,8).toUpperCase()}</div>
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                {SIDEBAR.map(item=>{
                  const active = item.label===tabLabel || (item.label==="Dashboard"&&false);
                  return (
                    <div key={item.label} onClick={item.action} style={{ display:"flex",alignItems:"center",gap:14,padding:"11px 18px",borderRadius:10,cursor:"pointer",background:active?"rgba(99,58,25,0.1)":"transparent",color:active?"#633a19":"#374151",fontWeight:active?700:500,fontSize:15,transition:"background 0.2s" }}>
                      <i className={item.icon} style={{ width:20,textAlign:"center",color:active?"#633a19":"#9ca3af" }}/>
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="col-12 col-md-9 d-flex flex-column gap-4">

            {/* ── PROFILE ── */}
            {activeTab==="profile" && (
              <>
                <div style={{ background:"#fff",borderRadius:16,padding:"28px 32px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                  {photoAlert && <Alert type={photoAlert.type} msg={photoAlert.msg} onClose={()=>setPhotoAlert(null)}/>}
                  <div className="d-flex align-items-start gap-4 flex-wrap">
                    {/* avatar */}
                    <div style={{ position:"relative",flexShrink:0 }}>
                      <div style={{ width:110,height:110,borderRadius:16,overflow:"hidden",background:"linear-gradient(135deg,#c9a07a,#633a19)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        {photoURL
                          ? <img src={photoURL} alt="profile" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                          : <i className="fa-solid fa-user" style={{ color:"#fff",fontSize:42 }}/>}
                      </div>
                      {/* camera btn */}
                      <button onClick={()=>fileInputRef.current?.click()} disabled={uploading} title="Change photo"
                        style={{ position:"absolute",bottom:-8,right:-8,width:32,height:32,borderRadius:"50%",background:"#633a19",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                        {uploading
                          ? <span className="spinner-border spinner-border-sm text-white" style={{ width:12,height:12,borderWidth:2 }}/>
                          : <i className="fa-solid fa-camera" style={{ color:"#fff",fontSize:12 }}/>}
                      </button>
                      {/* delete btn — only when photo exists */}
                      {photoURL && (
                        <button onClick={handleDeletePhoto} disabled={uploading} title="Delete photo"
                          style={{ position:"absolute",bottom:-8,left:-8,width:32,height:32,borderRadius:"50%",background:"#ef4444",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                          <i className="fa-solid fa-trash" style={{ color:"#fff",fontSize:11 }}/>
                        </button>
                      )}
                    </div>
                    {/* info */}
                    <div style={{ flex:1,minWidth:200 }}>
                      <div style={{ fontWeight:800,fontSize:24,color:"#1f2937",marginBottom:2 }}>{displayName}</div>
                      <div style={{ display:"inline-block",background:"rgba(99,58,25,0.1)",color:"#633a19",borderRadius:20,fontSize:12,fontWeight:600,padding:"3px 12px",marginBottom:20 }}>
                        {userData?.role==="doctor"?"Faculty Member":userData?.role==="admin"?"Administrator":"Member"}
                      </div>
                      <div className="row g-3">
                        <div className="col-12 col-sm-6"><InfoRow icon="fa-solid fa-id-badge" value={`ID: ${userData?.Userid || userData?.uid?.slice(0,8).toUpperCase() || "—"}`}/></div>
                        <div className="col-12 col-sm-6"><InfoRow icon="fa-regular fa-envelope" value={userData?.email||"—"}/></div>
                        <div className="col-12 col-sm-6"><InfoRow icon="fa-solid fa-phone" value={userData?.phone||"Not provided"}/></div>
                        <div className="col-12 col-sm-6"><InfoRow icon="fa-regular fa-calendar-check" value={`Member since: ${memberSince}`}/></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Borrowing + Wishlist row */}
                <div className="row g-4">
                  <div className="col-12 col-lg-6">
                    <div style={{ background:"#fff",borderRadius:16,padding:"22px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",height:"100%" }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <i className="fa-solid fa-bookmark" style={{ color:"#633a19" }}/>
                          <span style={{ fontWeight:700,fontSize:17,color:"#1f2937" }}>Currently Borrowing</span>
                        </div>
                        <Link to="/my-borrowed-books" style={{ fontSize:13,color:"#633a19",fontWeight:600,textDecoration:"none" }}>View All</Link>
                      </div>
                      {borrowed.length===0 ? (
                        <div style={{ textAlign:"center",padding:"32px 0",color:"#9ca3af" }}>
                          <i className="fa-solid fa-book-open" style={{ fontSize:32,marginBottom:12,display:"block" }}/>
                          <p style={{ fontSize:14 }}>No active borrows</p>
                          <Link to="/catalog" className="btn btn-sm rounded-pill px-4" style={{ background:"#633a19",color:"#fff",fontSize:13,textDecoration:"none" }}>Browse Catalog</Link>
                        </div>
                      ) : (
                        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                          {borrowed.slice(0,3).map(b=><BookCard key={b.id} book={b}/>)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div style={{ background:"#fff",borderRadius:16,padding:"22px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",height:"100%" }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <i className="fa-solid fa-heart" style={{ color:"#633a19" }}/>
                          <span style={{ fontWeight:700,fontSize:17,color:"#1f2937" }}>Wishlist</span>
                        </div>
                        <span onClick={()=>setActiveTab("wishlist")} style={{ fontSize:13,color:"#633a19",fontWeight:600,cursor:"pointer" }}>Manage</span>
                      </div>
                      {wishlist.length===0 ? (
                        <div style={{ textAlign:"center",padding:"32px 0",color:"#9ca3af" }}>
                          <i className="fa-solid fa-heart" style={{ fontSize:32,marginBottom:12,display:"block" }}/>
                          <p style={{ fontSize:14 }}>No books in wishlist</p>
                          <Link to="/catalog" className="btn btn-sm rounded-pill px-4" style={{ background:"#633a19",color:"#fff",fontSize:13,textDecoration:"none" }}>Browse Catalog</Link>
                        </div>
                      ) : wishlist.slice(0,3).map((w,i)=>(
                        <div key={i} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<2?"1px solid #f5f5f5":"none" }}>
                          <div style={{ width:44,height:58,borderRadius:6,flexShrink:0,background:"linear-gradient(135deg,#9e734a,#4a2c13)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                            <i className="fa-solid fa-book" style={{ color:"rgba(255,255,255,0.6)",fontSize:14 }}/>
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontWeight:700,fontSize:14,color:"#1f2937" }}>{w.title}</div>
                            <div style={{ fontSize:12,color:"#6b7280" }}>{w.author}</div>
                            <div style={{ fontSize:12,color:w.available?"#16a34a":"#f59e0b",fontWeight:600,marginTop:2 }}>{w.available?"Available Now":"Not Available"}</div>
                          </div>
                          <Link to="/catalog" style={{ background:"#f3f4f6",color:"#374151",borderRadius:8,fontSize:12,fontWeight:600,padding:"5px 14px",textDecoration:"none",flexShrink:0 }}>Borrow</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{ background:"#fff",borderRadius:16,padding:"22px 28px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:18 }}>
                    <div style={{ width:48,height:48,borderRadius:"50%",background:"rgba(99,58,25,0.1)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <i className="fa-solid fa-lightbulb" style={{ color:"#633a19",fontSize:20 }}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:700,fontSize:16,color:"#1f2937" }}>Need a recommendation?</div>
                      <div style={{ fontSize:13,color:"#6b7280" }}>Based on your history, we think you'll love contemporary sci-fi.</div>
                    </div>
                  </div>
                  <Link to="/catalog" className="btn fw-semibold rounded-pill px-4 py-2" style={{ background:"#633a19",color:"#fff",fontSize:14,textDecoration:"none" }}>Explore Catalog</Link>
                </div>
              </>
            )}

            {activeTab==="wishlist"  && <WishlistPanel wishlist={wishlist} onRemove={i=>setWishlist(p=>p.filter((_,j)=>j!==i))}/>}
            {activeTab==="history"   && <HistoryPanel history={history}/>}
            {activeTab==="settings"  && authUser && <SettingsPanel userData={userData} authUser={authUser}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;