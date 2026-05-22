import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// API Route: Analyze note for automatic reminders
app.post("/api/analyze-note", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is not configured in this workspace." });
    }

    const { content, currentDate } = req.body;
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.json({ reminders: [] });
    }

    // Call Gemini to parse contents
    const prompt = `
      Current server time reference: ${currentDate || new Date().toISOString()}
      Teks Catatan Harian: "${content}"

      Analisis teks catatan harian di atas. Cari semua rencana, agenda, tugas, janji temu, pengingat, atau hal penting yang disebutkan yang memiliki kaitan dengan waktu (misalnya: "besok pagi jam 9", "Senin jam 2 siang", "nanti malam jam 8", "minggu depan tanggal 25 jam 10", dll).
      Konversikan ekspresi waktu relatif tersebut menjadi waktu absolut ISO 8601 UTC berdasarkan "Current server time reference" di atas.
      Jika waktu tidak ditentukan secara spesifik (misal hanya disebut "besok"), asumsikan waktu pukul 09:00:00 pagi pada hari tersebut.
      Kembalikan daftar pengingat yang ditemukan dalam bentuk JSON array sesuai skema yang disediakan. Jika tidak ditemukan agenda apa pun, kembalikan array kosong [].
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah modul ekstraksi jadwal dan pengingat otomatis berbahasa Indonesia. Tugas Anda adalah menguraikan teks bahasa alami dan mengekstrak jadwal masa depan secara akurat ke format ISO 8601 UTC.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of extracted automatic reminders",
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Judul singkat pengingat atau kegiatan (misal: Meeting dengan Pak Budi, Istirahat makan siang)."
              },
              dateTime: {
                type: Type.STRING,
                description: "ISO 8601 Date String yang merupakan tanggal dan waktu absolut dari pemicu pengingat ini dalam zona waktu UTC."
              },
              description: {
                type: Type.STRING,
                description: "Keterangan atau rincian tambahan terkait pengingat ini."
              },
              sourceText: {
                type: Type.STRING,
                description: "Kutipan kalimat atau frasa dari catatan yang mendasari ditariknya pengingat ini."
              }
            },
            required: ["title", "dateTime", "sourceText"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    let reminders = [];
    try {
      reminders = JSON.parse(resultText);
    } catch (parseErr) {
      console.error("Error parsing Gemini JSON:", parseErr);
      reminders = [];
    }

    return res.json({ reminders });
  } catch (err: any) {
    console.error("API Error at analyze-note:", err);
    return res.status(500).json({ error: err.message || "Terjadi kesalahan internal ketika menganalisis catatan." });
  }
});

// API Route: Analyze note mood and generate smart reflection / journal insights
app.post("/api/generate-insights", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is not configured in this workspace." });
    }

    const { content } = req.body;
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ error: "Konten catatan kosong." });
    }

    const prompt = `
      Catatan harian pengguna:
      "${content}"

      Berikan analisis psikologis/emosional singkat yang suportif, refleksi pribadi, skor kepositifan/energi (0-100), tema utama, dan rekomendasi tag dalam bahasa Indonesia.
      Tentukan mood utama dari daftar mood berikut: 'happy', 'neutral', 'sad', 'excited', 'tired', 'peaceful'.
      Pilih emoji mood yang sesuai.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah konselor buku harian (journal therapist) bertenaga AI yang suportif, peka, dan berempati tinggi. Berikan tanggapan yang mencerahkan secara emosional dan bantu pengguna memahami dirinya sendiri melalui tulisannya.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moodLabel: {
              type: Type.STRING,
              description: "Harus salah satu dari mood ini: 'happy', 'neutral', 'sad', 'excited', 'tired', 'peaceful'."
            },
            moodEmoji: {
              type: Type.STRING,
              description: "Satu karakter emoji yang representatif terhadap mood catatan (misal: 😊, 😐, 😢, 🤩, 😴, 🧘)."
            },
            summary: {
              type: Type.STRING,
              description: "Tanggapan cerdas berbentuk paragraf refleksi personal, masukan, atau kata-kata motivasi yang hangat terkait catatan mereka (1-3 kalimat saja)."
            },
            positivityScore: {
              type: Type.INTEGER,
              description: "Skor persentase emosi positif atau tingkat kenyamanan tulisan (0-100)."
            },
            keyThemes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Tema-tema utama yang disoroti dalam catatan harian ini (maksimum 3 tema)."
            },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Rekomendasi tag atau tagar yang cocok untuk melabeli tulisan ini (misal: #pekerjaan, #keluarga, #refleksi, #kesehatan)."
            }
          },
          required: ["moodLabel", "moodEmoji", "summary", "positivityScore", "keyThemes", "suggestedTags"]
        }
      }
    });

    const resultText = response.text || "{}";
    let insights = {};
    try {
      insights = JSON.parse(resultText);
    } catch (parseErr) {
      console.error("Error parsing insights JSON:", parseErr);
      return res.status(500).json({ error: "Gagal memproses hasil analisis AI." });
    }

    return res.json({ insights });
  } catch (err: any) {
    console.error("API Error at generate-insights:", err);
    return res.status(500).json({ error: err.message || "Gagal membangkitkan wawasan harian otomatis." });
  }
});

// Configure Vite or Static Asset File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
