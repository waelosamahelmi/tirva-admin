import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranches } from "@/hooks/use-branches";
import {
  useLounasMenus,
  useDeleteLounasMenu,
  getCurrentWeek,
} from "@/hooks/use-lounas-menus";
import { useLounasSettings, formatTime } from "@/hooks/use-lounas-settings";
import { LounasMenuModal } from "@/components/lounas-menu-modal";
import { LounasSettingsModal } from "@/components/lounas-settings-modal";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Leaf, Wheat, Droplet, Milk, Flame, Store, Calendar, UtensilsCrossed, ArrowLeft, Moon, Sun, Globe, Menu, X, LogOut } from "lucide-react";
import type { LounasMenu } from "@/hooks/use-lounas-menus";
import { useLocation } from "wouter";
import { useTheme } from "@/lib/theme-context";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";
import { Switch } from "@/components/ui/switch";

export default function LounasAdmin() {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const { data: branches } = useBranches();
  const deleteMenu = useDeleteLounasMenu();
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useSupabaseAuth();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentWeekInfo = getCurrentWeek();
  const [selectedBranchId, setSelectedBranchId] = useState<number>(0);
  const [weekNumber, setWeekNumber] = useState(currentWeekInfo.week);
  const [year, setYear] = useState(currentWeekInfo.year);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<LounasMenu | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { data: menus, refetch } = useLounasMenus(
    selectedBranchId || undefined,
    weekNumber,
    year
  );

  const { data: lounasSettings } = useLounasSettings(selectedBranchId || undefined);

  // Auto-select first branch if none selected
  if (branches && branches.length > 0 && !selectedBranchId) {
    setSelectedBranchId(branches[0].id);
  }

  const dayNames = {
    fi: ["Sunnuntai", "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  };

  // Get the actual date for a day of week in the selected week
  const getDateForDay = (dayOfWeek: number) => {
    // Get first day of the year
    const firstDayOfYear = new Date(year, 0, 1);
    // ISO week starts on Monday, so we need to adjust
    const daysSinceFirstMonday = (weekNumber - 1) * 7 + (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    // Find the first Monday of the year
    const firstMonday = new Date(firstDayOfYear);
    const dayOfWeekJan1 = firstMonday.getDay();
    const daysToFirstMonday = dayOfWeekJan1 === 0 ? 1 : (8 - dayOfWeekJan1);
    firstMonday.setDate(firstMonday.getDate() + daysToFirstMonday);
    // Calculate the target date
    const targetDate = new Date(firstMonday);
    targetDate.setDate(targetDate.getDate() + daysSinceFirstMonday);
    return targetDate;
  };

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}.${month}.`;
  };

  const handleAddMenu = (dayOfWeek: number) => {
    if (!selectedBranchId) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Valitse toimipiste", "Please select a branch"),
        variant: "destructive",
      });
      return;
    }
    setSelectedDay(dayOfWeek);
    setEditingMenu(null);
    setIsModalOpen(true);
  };

  const handleEditMenu = (menu: LounasMenu) => {
    setSelectedDay(menu.day_of_week);
    setEditingMenu(menu);
    setIsModalOpen(true);
  };

  const handleDeleteMenu = async (id: number) => {
    if (!confirm(t("Haluatko varmasti poistaa tämän lounaan?", "Are you sure you want to delete this lunch item?"))) {
      return;
    }
    try {
      await deleteMenu.mutateAsync(id);
      toast({
        title: t("Onnistui", "Success"),
        description: t("Lounas poistettu", "Lunch item deleted"),
      });
      refetch();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: t("Virhe", "Error"),
        description: t("Poisto epäonnistui", "Delete failed"),
        variant: "destructive",
      });
    }
  };

  const handlePreviousWeek = () => {
    if (weekNumber === 1) {
      setWeekNumber(52);
      setYear(year - 1);
    } else {
      setWeekNumber(weekNumber - 1);
    }
  };

  const handleNextWeek = () => {
    if (weekNumber === 52) {
      setWeekNumber(1);
      setYear(year + 1);
    } else {
      setWeekNumber(weekNumber + 1);
    }
  };

  const getMenusForDay = (dayOfWeek: number) => {
    return menus?.filter((m) => m.day_of_week === dayOfWeek) || [];
  };

  const DietaryTag = ({ icon: Icon, label, color }: { icon: any; label: string; color: string }) => (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );

  const isCurrentWeek = weekNumber === currentWeekInfo.week && year === currentWeekInfo.year;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Back Button & Logo */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <UtensilsCrossed className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("Lounas-valikko", "Lunch Menu", "قائمة الغداء", "Обеденное меню", "Lunchmeny")}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("Hallintapaneeli", "Admin Panel", "لوحة الإدارة", "Панель управления", "Adminpanel")}
                </p>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="px-3 py-2"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              
              {/* Language Selection */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                  className="px-3 py-2 flex items-center space-x-2"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {language === "fi" ? "FI" : language === "en" ? "EN" : language === "ar" ? "AR" : language === "ru" ? "RU" : "SV"}
                  </span>
                </Button>
                
                {isLanguageMenuOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <button
                      onClick={() => {
                        setLanguage("fi");
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg text-sm ${
                        language === "fi" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                      }`}
                    >
                      🇫🇮 Suomi
                    </button>
                    <button
                      onClick={() => {
                        setLanguage("en");
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${
                        language === "en" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                      }`}
                    >
                      🇺🇸 English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage("ar");
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg text-sm ${
                        language === "ar" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                      }`}
                    >
                      🇸🇦 العربية
                    </button>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="px-3 py-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="px-4 py-4 space-y-4">
              {/* Theme Toggle */}
              <Button
                variant="outline"
                onClick={toggleTheme}
                className="w-full justify-start"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {theme === "dark" ? t("Vaalea teema", "Light theme", "السمة الفاتحة", "Светлая тема", "Ljust tema") : t("Tumma teema", "Dark theme", "السمة المظلمة", "Темная тема", "Mörkt tema")}
              </Button>

              {/* Language Selection */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("Kieli", "Language", "اللغة", "Язык", "Språk")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setLanguage("fi");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "fi" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇫🇮 FI
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("en");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "en" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇺🇸 EN
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("ar");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "ar" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇸🇦 AR
                  </button>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  signOut();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("Kirjaudu ulos", "Logout", "تسجيل الخروج", "Выход", "Logga ut")}
              </Button>
            </div>
          </div>
        )}
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UtensilsCrossed className="w-8 h-8" />
              {t("Lounas-valikko", "Lunch Menu", "قائمة الغداء", "Обеденное меню", "Lunchmeny")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t("Luo ja muokkaa viikon lounas-tarjontaa", "Create and edit weekly lunch offerings", "إنشاء وتحرير عروض الغداء الأسبوعية", "Создавайте и редактируйте еженедельные обеденные предложения", "Skapa och redigera veckans luncherbjudanden")}
            </p>
          </div>
        </div>

        {/* Lunch Time Info */}
        <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t("Lounasaika", "Lunch Time", "وقت الغداء", "Время обеда", "Lunchtid")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {lounasSettings && !Array.isArray(lounasSettings)
                      ? `${formatTime(lounasSettings.start_time)} - ${formatTime(lounasSettings.end_time)}`
                      : t("Arkisin klo 10:30 - 14:00", "Weekdays 10:30 - 14:00", "أيام الأسبوع 10:30 - 14:00", "По будням 10:30 - 14:00", "Vardagar 10:30 - 14:00")
                    }
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsSettingsModalOpen(true)}
                disabled={!selectedBranchId}
              >
                {t("Muokkaa aikoja", "Edit times", "تحرير الأوقات", "Изменить время", "Redigera tider")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3 flex-1">
            <Store className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <Select value={selectedBranchId.toString()} onValueChange={(val) => setSelectedBranchId(parseInt(val))}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder={t("Valitse toimipiste", "Select branch", "اختر الفرع", "Выберите филиал", "Välj filial")} />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[150px] px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="font-semibold text-sm">
                {t("Viikko", "Week", "أسبوع", "Неделя", "Vecka")} {weekNumber}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {year}
                {isCurrentWeek && (
                  <span className="ml-1 text-primary font-semibold">
                    ({t("Nykyinen", "Current", "الحالي", "Текущая", "Aktuell")})
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!selectedBranchId ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t("Valitse toimipiste aloittaaksesi", "Select a branch to get started", "اختر فرعًا للبدء", "Выберите филиал для начала", "Välj en filial för att börja")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const dayMenus = getMenusForDay(day);
              return (
                <Card key={day}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            {t(dayNames.fi[day], dayNames.en[day], "", "", "")}
                          </CardTitle>
                          {dayMenus.length > 0 && dayMenus[0].price && (
                            <div className="text-xl font-bold text-primary">
                              {dayMenus[0].price}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground ml-8 mt-1">
                          {formatDate(getDateForDay(day))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMenu(day)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        {t("Lisää", "Add", "إضافة", "Добавить", "Lägg till")}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dayMenus.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        {t("Ei lounasta tälle päivälle", "No lunch items for this day", "لا توجد عناصر غداء لهذا اليوم", "Нет обеда на этот день", "Ingen lunch för denna dag")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dayMenus.map((menu) => (
                          <div
                            key={menu.id}
                            className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{menu.name}</h4>
                                {menu.name_en && (
                                  <span className="text-sm text-gray-600 dark:text-gray-400">/ {menu.name_en}</span>
                                )}
                              </div>
                              {menu.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{menu.description}</p>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {menu.is_vegan && (
                                  <DietaryTag
                                    icon={Leaf}
                                    label={t("Vegaani", "Vegan", "نباتي", "Веган", "Vegansk")}
                                    color="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  />
                                )}
                                {menu.is_gluten_free && (
                                  <DietaryTag
                                    icon={Wheat}
                                    label={t("Gluteeniton", "GF", "خالي من الغلوتين", "Без глютена", "Glutenfri")}
                                    color="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                  />
                                )}
                                {menu.is_lactose_free && (
                                  <DietaryTag
                                    icon={Droplet}
                                    label={t("Laktoositon", "LF", "خالي من اللاكتوز", "Без лактозы", "Laktosfri")}
                                    color="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  />
                                )}
                                {menu.is_milk_free && (
                                  <DietaryTag
                                    icon={Milk}
                                    label={t("Maidoton", "DF", "خالي من الحليب", "Без молочных продуктов", "Mjölkfri")}
                                    color="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                  />
                                )}
                                {menu.is_hot && (
                                  <DietaryTag
                                    icon={Flame}
                                    label={t("Tulinen", "Hot", "ساخن", "Острое", "Het")}
                                    color="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditMenu(menu)}
                                className="hover:bg-blue-50 dark:hover:bg-blue-900"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteMenu(menu.id)}
                                className="hover:bg-red-50 dark:hover:bg-red-900"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <LounasMenuModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingMenu(null);
            refetch();
          }}
          menu={editingMenu}
          branchId={selectedBranchId}
          weekNumber={weekNumber}
          year={year}
          dayOfWeek={selectedDay}
        />

        <LounasSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          branchId={selectedBranchId}
          currentSettings={lounasSettings && !Array.isArray(lounasSettings) ? lounasSettings : null}
        />
      </div>
    </div>
  );
}



