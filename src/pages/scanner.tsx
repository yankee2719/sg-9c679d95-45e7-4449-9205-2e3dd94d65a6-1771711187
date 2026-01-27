import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { QRCodeScanner } from "@/components/QRCodeScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  QrCode,
  Keyboard,
  History,
  Search,
  Camera
} from "lucide-react";

interface ScanHistory {
  id: string;
  code: string;
  equipmentName: string;
  timestamp: string;
}

export default function ScannerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"scanner" | "manual">("scanner");
  const [manualCode, setManualCode] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([
    {
      id: "1",
      code: "EQ-001",
      equipmentName: "Pressa Idraulica A1",
      timestamp: "2026-01-27T21:30:00"
    },
    {
      id: "2",
      code: "EQ-002",
      equipmentName: "Tornio CNC B2",
      timestamp: "2026-01-27T20:15:00"
    },
    {
      id: "3",
      code: "EQ-003",
      equipmentName: "Robot Saldatura C3",
      timestamp: "2026-01-27T19:45:00"
    }
  ]);

  const handleScan = (code: string) => {
    console.log("QR Code scanned:", code);
    
    // Add to history
    const newScan: ScanHistory = {
      id: Date.now().toString(),
      code,
      equipmentName: "Equipment " + code,
      timestamp: new Date().toISOString()
    };
    
    setScanHistory(prev => [newScan, ...prev.slice(0, 9)]);
    
    // Redirect to equipment detail page
    // Assuming code format is "EQ-XXX" and we extract the ID
    const equipmentId = code.replace("EQ-", "");
    router.push(`/equipment/${equipmentId}`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Ora";
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    return past.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  };

  return (
    <>
      <SEO title="Scanner QR - Maint Ops" />
      
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">Scanner QR Code</h1>
                <p className="text-sm text-slate-400">Scansiona o inserisci il codice manualmente</p>
              </div>
            </div>
            
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2">
              <Camera className="h-4 w-4 mr-2" />
              Pronto
            </Badge>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          
          {/* Tab Switcher */}
          <div className="flex gap-3">
            <Button
              onClick={() => setActiveTab("scanner")}
              className={`flex-1 h-14 rounded-xl font-semibold transition-all ${
                activeTab === "scanner"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <QrCode className="h-5 w-5 mr-2" />
              Scansiona QR
            </Button>
            
            <Button
              onClick={() => setActiveTab("manual")}
              className={`flex-1 h-14 rounded-xl font-semibold transition-all ${
                activeTab === "manual"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Keyboard className="h-5 w-5 mr-2" />
              Inserimento Manuale
            </Button>
          </div>

          {/* Scanner Tab */}
          {activeTab === "scanner" && (
            <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Scanner Component */}
                  <div className="bg-slate-900 rounded-2xl overflow-hidden">
                    <QRCodeScanner onScan={handleScan} />
                  </div>
                  
                  {/* Instructions */}
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-white">
                      Inquadra il QR Code del macchinario
                    </p>
                    <p className="text-sm text-slate-400">
                      Posiziona il QR code all'interno del riquadro per scansionare automaticamente
                    </p>
                  </div>

                  {/* Tips */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Camera className="w-6 h-6 text-blue-400" />
                      </div>
                      <p className="text-sm font-medium text-white mb-1">Inquadra bene</p>
                      <p className="text-xs text-slate-400">Mantieni il QR code centrato</p>
                    </div>
                    
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <QrCode className="w-6 h-6 text-amber-400" />
                      </div>
                      <p className="text-sm font-medium text-white mb-1">Buona luce</p>
                      <p className="text-xs text-slate-400">Assicurati di avere luce sufficiente</p>
                    </div>
                    
                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6 text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-white mb-1">Distanza giusta</p>
                      <p className="text-xs text-slate-400">Non troppo vicino o lontano</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Input Tab */}
          {activeTab === "manual" && (
            <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Keyboard className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Inserimento Manuale</h3>
                    <p className="text-sm text-slate-400">
                      Digita il codice del macchinario che trovi sull'etichetta
                    </p>
                  </div>

                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Codice Equipaggiamento
                      </label>
                      <Input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        placeholder="EQ-001"
                        className="h-14 bg-slate-700 border-slate-600 text-white text-lg font-mono placeholder:text-slate-500 text-center rounded-xl"
                        autoFocus
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Search className="h-5 w-5 mr-2" />
                      Cerca Equipaggiamento
                    </Button>
                  </form>

                  {/* Format Examples */}
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Formati accettati:</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-slate-700 text-slate-300 border-slate-600 font-mono">
                        EQ-001
                      </Badge>
                      <Badge className="bg-slate-700 text-slate-300 border-slate-600 font-mono">
                        EQ-123
                      </Badge>
                      <Badge className="bg-slate-700 text-slate-300 border-slate-600 font-mono">
                        EQ-999
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <History className="h-5 w-5 text-slate-400" />
              <h3 className="text-lg font-bold text-white">Scansioni Recenti</h3>
            </div>

            {scanHistory.length > 0 ? (
              <div className="space-y-3">
                {scanHistory.map((scan) => (
                  <Card
                    key={scan.id}
                    className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group"
                    onClick={() => {
                      const equipmentId = scan.code.replace("EQ-", "");
                      router.push(`/equipment/${equipmentId}`);
                    }}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <QrCode className="w-6 h-6 text-blue-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white mb-1">{scan.equipmentName}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-700 text-slate-300 border-slate-600 font-mono text-xs">
                            {scan.code}
                          </Badge>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400">
                            {formatRelativeTime(scan.timestamp)}
                          </span>
                        </div>
                      </div>

                      <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-blue-400 transition-colors rotate-180" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 text-center">
                <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Nessuna scansione recente</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}