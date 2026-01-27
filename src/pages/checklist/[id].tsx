import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Flag,
  MessageSquarePlus,
  Edit3,
  Check
} from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export default function ChecklistExecutionPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState("00:21:18");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  
  const [checklistData, setChecklistData] = useState({
    title: "Checklist Manutenzione",
    equipmentName: "Pressa Idraulica A1",
    technicianName: "Marco Rossi",
    startTime: "27/01/2026 23:11",
    duration: "21m"
  });

  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: "1",
      title: "Spegnimento macchina",
      description: "Verificare lo spegnimento completo e attivare blocco di sicurezza",
      required: true,
      completed: true,
      completedAt: "22:18"
    },
    {
      id: "2",
      title: "Controllo visivo",
      description: "Ispezionare visivamente tutti i componenti per danni o usura",
      required: true,
      completed: true,
      completedAt: "22:18"
    },
    {
      id: "3",
      title: "Pulizia area di lavoro",
      description: "Rimuovere trucioli e residui di lavorazione dalla macchina",
      required: true,
      completed: true,
      completedAt: "22:18"
    },
    {
      id: "4",
      title: "Controllo livelli olio",
      description: "Verificare e rabboccare se necessario i livelli dell'olio idraulico",
      required: true,
      completed: true,
      completedAt: "22:20"
    },
    {
      id: "5",
      title: "Ingrassaggio componenti",
      description: "Applicare grasso ai punti di lubrificazione secondo manuale",
      required: false,
      completed: true,
      completedAt: "22:25"
    },
    {
      id: "6",
      title: "Test funzionamento",
      description: "Eseguire test a vuoto per verificare il corretto funzionamento",
      required: true,
      completed: true,
      completedAt: "22:30"
    },
    {
      id: "7",
      title: "Documentazione fotografica",
      description: "Scattare foto delle aree critiche e degli interventi effettuati",
      required: false,
      completed: true,
      completedAt: "22:32"
    }
  ]);

  useEffect(() => {
    if (!id) return;
    
    // Simulate timer
    const interval = setInterval(() => {
      // Timer logic here
    }, 1000);

    setLoading(false);

    return () => clearInterval(interval);
  }, [id]);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const toggleItemCompletion = (itemId: string) => {
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : undefined }
        : item
    ));
  };

  const handleCompleteAndSign = () => {
    if (completedCount === totalCount) {
      setShowSignatureModal(true);
    }
  };

  const handleSubmitSignature = () => {
    if (signatureName.trim() && confirmChecked) {
      // Submit logic here
      router.push("/maintenance");
    }
  };

  if (loading) return null;

  return (
    <>
      <SEO title="Checklist Manutenzione - Maint Ops" />
      
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">{checklistData.title}</h1>
                <p className="text-sm text-slate-400">{checklistData.equipmentName}</p>
              </div>
            </div>
            
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2 text-base font-mono">
              <Clock className="h-4 w-4 mr-2" />
              {timer}
            </Badge>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
          
          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Progresso</p>
                <p className="text-2xl font-bold text-white">
                  {completedCount} di {totalCount} completati
                </p>
              </div>
              
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-500/10">
                  <span className="text-2xl font-bold text-green-400">{progressPercent}%</span>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <Card 
                key={item.id}
                className={`bg-slate-800/50 border transition-all ${
                  item.completed 
                    ? "border-green-500/30" 
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleItemCompletion(item.id)}
                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          item.completed
                            ? "bg-green-500 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                        }`}
                      >
                        {item.completed && <Check className="h-6 w-6" />}
                      </button>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`text-lg font-bold ${
                            item.completed ? "line-through text-slate-400" : "text-white"
                          }`}>
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{item.description}</p>
                        
                        {item.completed && item.completedAt && (
                          <div className="flex items-center gap-2 text-xs text-green-400">
                            <Clock className="h-3 w-3" />
                            <span>Completato alle {item.completedAt}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Badge Required */}
                    {item.required && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        Richiesto
                      </Badge>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Segnala
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Aggiungi nota
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom Fixed Button */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={handleCompleteAndSign}
              disabled={completedCount !== totalCount}
              className="w-full h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-6 w-6 mr-2" />
              Completa e Firma
            </Button>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-2">
              Firma Digitale
            </DialogTitle>
            <p className="text-sm text-slate-400 text-center">
              Conferma il completamento della checklist
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Summary Card */}
            <Card className="bg-slate-700/50 border-slate-600 p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tecnico</span>
                  <span className="text-white font-semibold">{checklistData.technicianName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data e Ora</span>
                  <span className="text-white font-semibold">{checklistData.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Durata</span>
                  <span className="text-white font-semibold">{checklistData.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Equipaggiamento</span>
                  <span className="text-white font-semibold">{checklistData.equipmentName}</span>
                </div>
              </div>
            </Card>

            {/* Name Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300 mb-2">
                <Edit3 className="h-4 w-4" />
                <label className="text-sm font-medium">Inserisci il tuo nome completo</label>
              </div>
              <Input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Nome e Cognome"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 h-12"
              />
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-slate-700/30 rounded-xl border border-slate-600">
              <Checkbox
                id="confirm"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
                className="mt-1 border-slate-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              <label
                htmlFor="confirm"
                className="text-sm text-slate-300 leading-relaxed cursor-pointer"
              >
                Confermo che tutte le attività sono state eseguite correttamente
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitSignature}
              disabled={!signatureName.trim() || !confirmChecked}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl disabled:opacity-50"
            >
              <Check className="h-5 w-5 mr-2" />
              Conferma e Invia
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}