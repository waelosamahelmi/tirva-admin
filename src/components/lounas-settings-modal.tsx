import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateLounasSettings, formatTime, formatTimeForDB, type LounasSettings } from "@/hooks/use-lounas-settings";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

interface LounasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number;
  currentSettings?: LounasSettings | null;
}

export function LounasSettingsModal({
  isOpen,
  onClose,
  branchId,
  currentSettings,
}: LounasSettingsModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const updateSettings = useUpdateLounasSettings();

  const [startTime, setStartTime] = useState("10:30");
  const [endTime, setEndTime] = useState("14:00");
  const [priceText, setPriceText] = useState("");
  const [priceTextEn, setPriceTextEn] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [servesSunday, setServesSunday] = useState(false);
  const [servesMonday, setServesMonday] = useState(true);
  const [servesTuesday, setServesTuesday] = useState(true);
  const [servesWednesday, setServesWednesday] = useState(true);
  const [servesThursday, setServesThursday] = useState(true);
  const [servesFriday, setServesFriday] = useState(true);
  const [servesSaturday, setServesSaturday] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setStartTime(formatTime(currentSettings.start_time));
      setEndTime(formatTime(currentSettings.end_time));
      setPriceText(currentSettings.price_text || "");
      setPriceTextEn(currentSettings.price_text_en || "");
      setIsEnabled(currentSettings.is_enabled ?? true);
      setServesSunday(currentSettings.serves_sunday);
      setServesMonday(currentSettings.serves_monday);
      setServesTuesday(currentSettings.serves_tuesday);
      setServesWednesday(currentSettings.serves_wednesday);
      setServesThursday(currentSettings.serves_thursday);
      setServesFriday(currentSettings.serves_friday);
      setServesSaturday(currentSettings.serves_saturday);
    }
  }, [currentSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateSettings.mutateAsync({
        branch_id: branchId,
        start_time: formatTimeForDB(startTime),
        end_time: formatTimeForDB(endTime),
        price_text: priceText || null,
        price_text_en: priceTextEn || null,
        is_enabled: isEnabled,
        serves_sunday: servesSunday,
        serves_monday: servesMonday,
        serves_tuesday: servesTuesday,
        serves_wednesday: servesWednesday,
        serves_thursday: servesThursday,
        serves_friday: servesFriday,
        serves_saturday: servesSaturday,
      });

      toast({
        title: t("Onnistui", "Success", "نجح", "Успех", "Framgång"),
        description: t("Lounasasetukset tallennettu", "Lunch settings saved", "تم حفظ إعدادات الغداء", "Настройки обеда сохранены", "Lunchinställningar sparade"),
      });

      onClose();
    } catch (error) {
      console.error("Error saving lounas settings:", error);
      toast({
        title: t("Virhe", "Error", "خطأ", "Ошибка", "Fel"),
        description: t("Asetusten tallennus epäonnistui", "Failed to save settings", "فشل حفظ الإعدادات", "Не удалось сохранить настройки", "Det gick inte att spara inställningar"),
        variant: "destructive",
      });
    }
  };

  const dayLabels = {
    sunday: t("Sunnuntai", "Sunday", "الأحد", "Воскресенье", "Söndag"),
    monday: t("Maanantai", "Monday", "الاثنين", "Понедельник", "Måndag"),
    tuesday: t("Tiistai", "Tuesday", "الثلاثاء", "Вторник", "Tisdag"),
    wednesday: t("Keskiviikko", "Wednesday", "الأربعاء", "Среда", "Onsdag"),
    thursday: t("Torstai", "Thursday", "الخميس", "Четверг", "Torsdag"),
    friday: t("Perjantai", "Friday", "الجمعة", "Пятница", "Fredag"),
    saturday: t("Lauantai", "Saturday", "السبت", "Суббота", "Lördag"),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("Lounasajan asetukset", "Lunch Time Settings", "إعدادات وقت الغداء", "Настройки времени обеда", "Lunchtidinställningar")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Aseta lounaan tarjoiluajat ja päivät",
              "Set lunch serving times and days",
              "تعيين أوقات وأيام تقديم الغداء",
              "Установите время и дни подачи обеда",
              "Ställ in lunchtider och dagar"
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable/Disable Lounas */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex-1">
              <Label htmlFor="is-enabled" className="cursor-pointer font-semibold">
                {t("Lounas käytössä", "Lounas Enabled", "الغداء مفعّل", "Обед включен", "Lunch aktiverad")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Näytä lounas-sivu verkkosivustolla", "Show lounas page on website", "إظهار صفحة الغداء على الموقع", "Показать страницу обеда на сайте", "Visa lunchsidan på webbplatsen")}
              </p>
            </div>
            <Switch
              id="is-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {/* Price Text */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">
              {t("Hinta-tieto", "Price Information", "معلومات السعر", "Информация о цене", "Prisinformation")}
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="price-text">
                  {t("Hinta (suomeksi)", "Price (Finnish)", "السعر (بالفنلندية)", "Цена (на финском)", "Pris (finska)")}
                </Label>
                <Input
                  id="price-text"
                  type="text"
                  placeholder={t("esim. 12 euroa / henkilö", "e.g. 12 euros per person", "مثلاً 12 يورو / شخص", "напр. 12 евро / человек", "t.ex. 12 euro / person")}
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="price-text-en">
                  {t("Hinta (englanniksi)", "Price (English)", "السعر (بالإنجليزية)", "Цена (на английском)", "Pris (engelska)")}
                </Label>
                <Input
                  id="price-text-en"
                  type="text"
                  placeholder="e.g. 12 euros per person"
                  value={priceTextEn}
                  onChange={(e) => setPriceTextEn(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Time Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">
              {t("Tarjoiluajat", "Serving Times", "أوقات التقديم", "Время подачи", "Serveringstider")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">
                  {t("Alkaa", "Start", "يبدأ", "Начало", "Start")}
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end-time">
                  {t("Päättyy", "End", "ينتهي", "Конец", "Slut")}
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Days Settings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">
              {t("Tarjoilupäivät", "Serving Days", "أيام التقديم", "Дни подачи", "Serveringsdagar")}
            </h3>
            <div className="space-y-2">
              {[
                { key: "sunday", value: servesSunday, setValue: setServesSunday },
                { key: "monday", value: servesMonday, setValue: setServesMonday },
                { key: "tuesday", value: servesTuesday, setValue: setServesTuesday },
                { key: "wednesday", value: servesWednesday, setValue: setServesWednesday },
                { key: "thursday", value: servesThursday, setValue: setServesThursday },
                { key: "friday", value: servesFriday, setValue: setServesFriday },
                { key: "saturday", value: servesSaturday, setValue: setServesSaturday },
              ].map(({ key, value, setValue }) => (
                <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Label htmlFor={`serves-${key}`} className="cursor-pointer">
                    {dayLabels[key as keyof typeof dayLabels]}
                  </Label>
                  <Switch
                    id={`serves-${key}`}
                    checked={value}
                    onCheckedChange={setValue}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("Peruuta", "Cancel", "إلغاء", "Отмена", "Avbryt")}
            </Button>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending
                ? t("Tallennetaan...", "Saving...", "جاري الحفظ...", "Сохранение...", "Sparar...")
                : t("Tallenna", "Save", "حفظ", "Сохранить", "Spara")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



