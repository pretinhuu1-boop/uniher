import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  Star,
  ArrowRight,
  CheckCircle2,
  Phone,
  Navigation,
  Heart,
  Filter,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pageVariants, staggerContainer, staggerItem } from "@/components/animations/PageTransition";

interface Clinic {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  phone: string;
  image: string;
  availableSlots: { date: string; times: string[] }[];
  services: string[];
  partnerDiscount?: number;
}

const clinics: Clinic[] = [
  {
    id: "1",
    name: "Clínica São Lucas",
    type: "Clínica Geral",
    address: "Av. Paulista, 1500 - Bela Vista",
    distance: "2.3 km",
    rating: 4.8,
    reviews: 324,
    phone: "(11) 3456-7890",
    image: "🏥",
    availableSlots: [
      { date: "Hoje", times: ["14:00", "15:30", "17:00"] },
      { date: "Amanhã", times: ["09:00", "10:30", "14:00", "16:00"] },
      { date: "Qua, 18 Dez", times: ["08:00", "11:00", "15:00"] },
    ],
    services: ["Ginecologia", "Mamografia", "Papanicolau", "Ultrassom"],
  },
  {
    id: "2",
    name: "Hospital Albert Einstein",
    type: "Hospital",
    address: "Av. Albert Einstein, 627 - Morumbi",
    distance: "5.1 km",
    rating: 4.9,
    reviews: 1245,
    phone: "(11) 2151-1233",
    image: "🏨",
    availableSlots: [
      { date: "Amanhã", times: ["10:00", "14:30"] },
      { date: "Qua, 18 Dez", times: ["09:00", "11:30", "15:00", "17:00"] },
    ],
    services: ["Todas especialidades", "Exames de imagem", "Laboratório"],
    partnerDiscount: 15,
  },
  {
    id: "3",
    name: "Laboratório Fleury",
    type: "Laboratório",
    address: "R. Cincinato Braga, 282 - Paraíso",
    distance: "1.8 km",
    rating: 4.7,
    reviews: 890,
    phone: "(11) 3017-3000",
    image: "🔬",
    availableSlots: [
      { date: "Hoje", times: ["07:00", "08:00", "09:00", "10:00", "11:00"] },
      { date: "Amanhã", times: ["07:00", "08:00", "09:00", "10:00"] },
    ],
    services: ["Exames de sangue", "Papanicolau", "HPV", "Hormônios"],
    partnerDiscount: 20,
  },
  {
    id: "4",
    name: "Clínica da Mulher",
    type: "Especializada",
    address: "R. Oscar Freire, 915 - Jardins",
    distance: "3.2 km",
    rating: 4.9,
    reviews: 567,
    phone: "(11) 3062-8888",
    image: "💗",
    availableSlots: [
      { date: "Hoje", times: ["16:00", "17:30"] },
      { date: "Amanhã", times: ["09:00", "10:30", "14:00", "15:30", "17:00"] },
    ],
    services: ["Ginecologia", "Obstetrícia", "Mastologia", "Endocrinologia feminina"],
  },
];

const ConciergePage = () => {
  const { addPoints, healthItems } = useUser();
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const urgentItems = healthItems.filter(item => item.status === "urgent" || item.status === "attention");

  const filteredClinics = clinics.filter(clinic => {
    const matchesSearch = clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || clinic.type.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesType;
  });

  const handleSelectSlot = (clinic: Clinic, date: string, time: string) => {
    setSelectedClinic(clinic);
    setSelectedSlot({ date, time });
    setShowConfirmModal(true);
  };

  const confirmAppointment = () => {
    if (selectedClinic && selectedSlot) {
      addPoints(150, "Consulta agendada via Concierge!");
      toast({
        title: "Agendamento Confirmado! 🎉",
        description: `${selectedClinic.name} - ${selectedSlot.date} às ${selectedSlot.time}`,
      });
      setShowConfirmModal(false);
      setSelectedClinic(null);
      setSelectedSlot(null);
    }
  };

  return (
    <MainLayout>
      <motion.div
        initial="initial"
        animate="animate"
        variants={pageVariants}
      >
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-primary">Concierge Digital</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Agende sua Consulta
          </h1>
          <p className="text-muted-foreground max-w-2xl mb-8">
            Conectamos você com a rede credenciada UniHer. Escolha o melhor horário e local para você.
          </p>
        </motion.div>

        {/* Urgent Items Alert */}
        {urgentItems.length > 0 && (
          <motion.div 
            className="bg-health-urgent-soft border border-health-urgent/20 rounded-2xl p-6 mb-8"
            variants={staggerItem}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start gap-4">
              <motion.div 
                className="w-12 h-12 rounded-xl bg-health-urgent/10 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Heart className="w-6 h-6 text-health-urgent" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-semibold text-health-urgent mb-1">Exames Pendentes</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Você tem {urgentItems.length} exame(s) que precisam de atenção. Agende agora!
                </p>
                <div className="flex flex-wrap gap-2">
                  {urgentItems.map(item => (
                    <span
                      key={item.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-health-urgent/10 text-health-urgent"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search and Filter */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 mb-6"
          variants={staggerItem}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar clínica ou exame..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="clínica">Clínicas</SelectItem>
              <SelectItem value="hospital">Hospitais</SelectItem>
              <SelectItem value="laboratório">Laboratórios</SelectItem>
              <SelectItem value="especializada">Especializadas</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Clinics Grid */}
        <motion.div 
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {filteredClinics.map((clinic, index) => (
            <motion.div
              key={clinic.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-card rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Clinic Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center text-3xl"
                      whileHover={{ rotate: 10, scale: 1.1 }}
                    >
                      {clinic.image}
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-card-foreground">{clinic.name}</h3>
                        {clinic.partnerDiscount && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-health-safe-soft text-health-safe">
                            -{clinic.partnerDiscount}% UniHer
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{clinic.type}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{clinic.distance}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-health-attention fill-health-attention" />
                          <span className="font-medium text-card-foreground">{clinic.rating}</span>
                          <span className="text-muted-foreground">({clinic.reviews})</span>
                        </div>
                        <button className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="w-4 h-4" />
                          <span>{clinic.phone}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                        <Navigation className="w-4 h-4" />
                        <span>{clinic.address}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {clinic.services.slice(0, 4).map((service, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded-lg text-xs bg-muted text-muted-foreground"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Available Slots */}
                  <div className="lg:w-80 lg:border-l lg:pl-6 border-border">
                    <p className="text-sm font-medium text-card-foreground mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Horários Disponíveis
                    </p>
                    <div className="space-y-3">
                      {clinic.availableSlots.slice(0, 2).map((slot) => (
                        <div key={slot.date}>
                          <p className="text-xs text-muted-foreground mb-2">{slot.date}</p>
                          <div className="flex flex-wrap gap-2">
                            {slot.times.slice(0, 3).map((time) => (
                              <motion.button
                                key={time}
                                onClick={() => handleSelectSlot(clinic, slot.date, time)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {time}
                              </motion.button>
                            ))}
                            {slot.times.length > 3 && (
                              <span className="px-3 py-1.5 text-xs text-muted-foreground">
                                +{slot.times.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {filteredClinics.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma clínica encontrada com esses filtros.</p>
          </motion.div>
        )}

        {/* Confirm Modal */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Confirmar Agendamento
              </DialogTitle>
            </DialogHeader>
            {selectedClinic && selectedSlot && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center text-2xl">
                      {selectedClinic.image}
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">{selectedClinic.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedClinic.address}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-card-foreground">Data</span>
                    </div>
                    <span className="text-sm font-medium text-primary">{selectedSlot.date}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-card-foreground">Horário</span>
                    </div>
                    <span className="text-sm font-medium text-primary">{selectedSlot.time}</span>
                  </div>
                  {selectedClinic.partnerDiscount && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-health-safe-soft">
                      <span className="text-sm font-medium text-health-safe">Desconto UniHer</span>
                      <span className="text-sm font-bold text-health-safe">-{selectedClinic.partnerDiscount}%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-soft">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm text-primary">Você ganhará 150 pontos com este agendamento</span>
                </div>

                <Button className="w-full" onClick={confirmAppointment}>
                  Confirmar Agendamento
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </MainLayout>
  );
};

export default ConciergePage;