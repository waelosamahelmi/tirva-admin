import { useState } from "react";
import {
  useToppingGroups,
  useMenuItemToppingGroups,
  useAssignToppingGroupToMenuItem,
  useRemoveToppingGroupFromMenuItem,
} from "@/hooks/use-topping-groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { Plus, X, Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MenuItemToppingGroupAssignmentProps {
  menuItemId: number;
  menuItemName: string;
}

export function MenuItemToppingGroupAssignment({ menuItemId, menuItemName }: MenuItemToppingGroupAssignmentProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: allToppingGroups } = useToppingGroups();
  const { data: assignedGroups, refetch } = useMenuItemToppingGroups(menuItemId);
  const assignGroup = useAssignToppingGroupToMenuItem();
  const removeGroup = useRemoveToppingGroupFromMenuItem();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Get IDs of already assigned groups
  const assignedGroupIds = assignedGroups?.map((item: any) => item.toppingGroupId || item.topping_group_id) || [];

  // Filter out already assigned groups
  const availableGroups = allToppingGroups?.filter(
    (group: any) => !assignedGroupIds.includes(group.id)
  ) || [];

  const handleAssign = async () => {
    if (!selectedGroupId) return;

    try {
      await assignGroup.mutateAsync({
        menuItemId,
        toppingGroupId: parseInt(selectedGroupId),
      });

      toast({
        title: t("Onnistui", "Success"),
        description: t("Täydennysryhmä liitetty tuotteeseen", "Topping group assigned to menu item"),
      });

      setSelectedGroupId("");
      refetch();
    } catch (error) {
      console.error('Assign error:', error);
      toast({
        title: t("Virhe", "Error"),
        description: error instanceof Error ? error.message : t("Liittäminen epäonnistui", "Assignment failed"),
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (toppingGroupId: number) => {
    try {
      await removeGroup.mutateAsync({
        menuItemId,
        toppingGroupId,
      });

      toast({
        title: t("Onnistui", "Success"),
        description: t("Täydennysryhmä poistettu tuotteesta", "Topping group removed from menu item"),
      });

      refetch();
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: t("Virhe", "Error"),
        description: error instanceof Error ? error.message : t("Poistaminen epäonnistui", "Removal failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mt-4 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="w-4 h-4" />
          {t("Tuotekohtaiset täydennysryhmät", "Item-Specific Topping Groups")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "Ohittaa kategorian oletusryhmät. Jos ei asetettu, käytetään kategorian ryhmiä.",
            "Overrides category default groups. If not set, category groups will be used."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Assigned Groups */}
        <div>
          <p className="text-sm font-semibold mb-2">
            {t("Liitetyt ryhmät:", "Assigned Groups:")}
          </p>
          {assignedGroups && assignedGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignedGroups.map((item: any) => {
                const group = item.toppingGroups || item.topping_groups;
                if (!group) return null;

                return (
                  <Badge key={item.id} variant="default" className="text-sm px-3 py-2">
                    {group.name}
                    <button
                      onClick={() => handleRemove(group.id)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {t("Ei tuotekohtaisia ryhmiä. Käyttää kategorian ryhmiä.", "No item-specific groups. Uses category groups.")}
            </p>
          )}
        </div>

        {/* Add New Group */}
        {availableGroups.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">
              {t("Liitä uusi ryhmä:", "Assign New Group:")}
            </p>
            <div className="flex gap-2">
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t("Valitse ryhmä", "Select group")} />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group: any) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name} ({group.name_en})
                      {group.is_required && " *"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssign}
                disabled={!selectedGroupId}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t("Liitä", "Assign")}
              </Button>
            </div>
          </div>
        )}

        {availableGroups.length === 0 && assignedGroups && assignedGroups.length > 0 && (
          <p className="text-sm text-gray-500">
            {t("Kaikki ryhmät on jo liitetty", "All groups are already assigned")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}



