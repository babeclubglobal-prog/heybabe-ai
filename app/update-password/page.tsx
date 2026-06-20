"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const updatePassword = async () => {
    if (!password) {
      alert("Please enter new password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password updated successfully!");

    // ส่งกลับไปหน้า login
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-6 bg-[#1f1f1f] rounded-2xl border border-pink-500/30">
        
        <h1 className="text-2xl font-bold text-pink-300 mb-4">
          Set New Password
        </h1>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-xl bg-[#111] border border-pink-500 text-white mb-4"
        />

        <button
          onClick={updatePassword}
          disabled={loading}
          className="w-full p-3 rounded-xl bg-pink-500 font-bold text-white"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}