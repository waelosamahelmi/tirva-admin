import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useQuery } from "@tanstack/react-query";
import { sendMarketingEmail } from "@/lib/email-service";
import { supabase } from "@/lib/supabase";
import { useBranches } from "@/hooks/use-branches";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Send, Users, CheckCircle, Loader2, Store, Image as ImageIcon, Facebook, Instagram, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// HTML Email Templates
const emailTemplates = {
  promotional: {
    name: "Promotional Offer",
    subject: "Special Offer Just for You!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: #000000; color: white; padding: 40px 30px; text-align: center; }
          .logo { max-width: 200px; height: auto; margin: 0 auto 20px; display: block; }
          .content { background: white; padding: 40px 30px; text-align: center; }
          .button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          .social-icons { margin: 20px 0; }
          .social-icons a { margin: 0 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="{{LOGO_URL}}" alt="Restaurant Logo" class="logo">
            <h1 style="margin: 0; color: white; font-size: 28px;">{{TITLE}}</h1>
          </div>
          <div class="content">
            <div style="font-size: 16px; line-height: 1.8; color: #333;">{{CONTENT}}</div>
            <a href="{{LINK}}" class="button">Order Now</a>
          </div>
          <div class="footer">
            <p style="margin: 10px 0; font-weight: bold; color: #333;">{{RESTAURANT_NAME}}</p>
            <p style="margin: 5px 0;">{{RESTAURANT_ADDRESS}}</p>
            <p style="margin: 5px 0;">{{RESTAURANT_PHONE}}</p>
            <div class="social-icons">{{SOCIAL_MEDIA}}</div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  newsletter: {
    name: "Newsletter",
    subject: "What's New at Our Restaurant",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 20px 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: #000000; color: white; padding: 40px 30px; text-align: center; }
          .logo { max-width: 200px; height: auto; margin: 0 auto 20px; display: block; }
          .content { background: white; padding: 40px 30px; text-align: center; }
          .section { margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #e5e7eb; }
          .section:last-child { border-bottom: none; }
          .button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
          .footer { background: #1f2937; color: white; padding: 30px; text-align: center; font-size: 13px; }
          .social-icons { margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="{{LOGO_URL}}" alt="Restaurant Logo" class="logo">
            <h1 style="margin: 0; color: white; font-size: 28px;">{{TITLE}}</h1>
            <p style="color: #cccccc; margin: 15px 0 0 0; font-size: 16px;">{{SUBTITLE}}</p>
          </div>
          <div class="content">
            <div style="font-size: 16px; line-height: 1.8; color: #333;">{{CONTENT}}</div>
          </div>
          <div class="footer">
            <p style="margin: 10px 0; font-weight: bold; font-size: 16px;">{{RESTAURANT_NAME}}</p>
            <p style="margin: 5px 0;">{{RESTAURANT_ADDRESS}} | {{RESTAURANT_PHONE}}</p>
            <div class="social-icons">{{SOCIAL_MEDIA}}</div>
            <p style="margin-top: 20px; color: #9ca3af; font-size: 12px;">You're receiving this because you're a valued customer</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  announcement: {
    name: "Announcement",
    subject: "Important Update from Us",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border: 2px solid #000000; border-radius: 10px; overflow: hidden; }
          .header { background: #000000; color: white; padding: 40px 30px; text-align: center; }
          .logo { max-width: 180px; height: auto; margin: 0 auto 15px; display: block; }
          .content { padding: 40px 30px; text-align: center; }
          .highlight { background: #fef2f2; border-left: 4px solid #dc2626; padding: 25px; margin: 20px 0; text-align: left; }
          .footer { background: #f9fafb; padding: 25px; text-align: center; font-size: 13px; color: #6b7280; }
          .social-icons { margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="{{LOGO_URL}}" alt="Restaurant Logo" class="logo">
            <h1 style="margin: 0; color: white; font-size: 26px;">?? {{TITLE}}</h1>
          </div>
          <div class="content">
            <div class="highlight">
              <div style="font-size: 16px; line-height: 1.8; color: #333;">{{CONTENT}}</div>
            </div>
            <p style="color: #6b7280; margin-top: 30px; font-size: 15px;">Thank you for your attention!</p>
          </div>
          <div class="footer">
            <p style="margin: 10px 0; font-weight: bold; color: #333;">{{RESTAURANT_NAME}}</p>
            <p style="margin: 5px 0;">{{RESTAURANT_PHONE}}</p>
            <div class="social-icons">{{SOCIAL_MEDIA}}</div>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

export function EmailMarketing() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: branches } = useBranches();
  const { data: restaurantConfig } = useRestaurantConfig();
  
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof emailTemplates>("promotional");
  const [emailSubject, setEmailSubject] = useState(emailTemplates.promotional.subject);
  const [emailTitle, setEmailTitle] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailLink, setEmailLink] = useState("");
  const [attachedImage, setAttachedImage] = useState<string>("");
  const [selectAll, setSelectAll] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Fetch customers who have ordered from the selected branch
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['branch-customers', selectedBranch],
    queryFn: async () => {
      if (!selectedBranch) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('customer_email, customer_name')
        .eq('branch_id', selectedBranch)
        .not('customer_email', 'is', null);
      
      if (error) {
        console.error('Failed to fetch customers:', error);
        throw error;
      }
      
      // Remove duplicates and format
      const uniqueCustomers = data.reduce((acc: any[], order) => {
        if (!acc.find(c => c.email === order.customer_email)) {
          acc.push({
            email: order.customer_email,
            name: order.customer_name || 'Customer'
          });
        }
        return acc;
      }, []);
      
      return uniqueCustomers;
    },
    enabled: !!selectedBranch
  });

  const handleTemplateChange = (template: keyof typeof emailTemplates) => {
    setSelectedTemplate(template);
    setEmailSubject(emailTemplates[template].subject);
  };

  const handleSendEmail = async () => {
    if (!selectedBranch) {
      toast({
        title: "Branch Required",
        description: "Please select a branch first",
        variant: "destructive"
      });
      return;
    }

    if (!emailTitle || !emailContent) {
      toast({
        title: "Missing Information",
        description: "Please fill in title and content",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    setEmailSent(false);

    try {
      const template = emailTemplates[selectedTemplate];
      let html = template.html;
      
      // Get branch info and restaurant config
      const branch = branches?.find(b => b.id === selectedBranch);
      const logoUrl = (restaurantConfig?.logo as any)?.imageUrl || 'https://tirvankahvila.fi/wp-content/uploads/2023/06/logo-header-01.webp';
      const socialMedia = (restaurantConfig?.socialMedia || {}) as any;
      
      // Build social media icons HTML
      let socialMediaHtml = '<div style="margin-top: 20px;">';
      if (socialMedia.facebook) {
        socialMediaHtml += `<a href="${socialMedia.facebook}" style="display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 32px; height: 32px;"></a>`;
      }
      if (socialMedia.instagram) {
        socialMediaHtml += `<a href="${socialMedia.instagram}" style="display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" style="width: 32px; height: 32px;"></a>`;
      }
      if (socialMedia.tiktok) {
        socialMediaHtml += `<a href="${socialMedia.tiktok}" style="display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png" alt="TikTok" style="width: 32px; height: 32px;"></a>`;
      }
      if (socialMedia.website) {
        socialMediaHtml += `<a href="${socialMedia.website}" style="display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 32px; height: 32px;"></a>`;
      }
      socialMediaHtml += '</div>';
      
      // Add attached image if present
      const imageHtml = attachedImage 
        ? `<div style="text-align: center; margin: 20px 0;"><img src="${attachedImage}" alt="Promotional Image" style="max-width: 100%; height: auto; border-radius: 8px;"></div>` 
        : '';
      
      // Replace placeholders
      html = html.replace('{{LOGO_URL}}', logoUrl);
      html = html.replace('{{TITLE}}', emailTitle);
      html = html.replace('{{SUBTITLE}}', emailSubject);
      html = html.replace('{{CONTENT}}', imageHtml + emailContent.replace(/\n/g, '<br>'));
      html = html.replace('{{LINK}}', emailLink || '#');
      html = html.replace(/{{RESTAURANT_NAME}}/g, restaurantConfig?.name || 'Tirvan Kahvila');
      html = html.replace(/{{RESTAURANT_ADDRESS}}/g, branch?.address?.street || (branch?.address as any) || 'Pasintie 2, 45410 Utti');
      html = html.replace(/{{RESTAURANT_PHONE}}/g, branch?.phone || restaurantConfig?.phone || '+358 41 3152619');
      html = html.replace('{{SOCIAL_MEDIA}}', socialMediaHtml);

      // Get recipient emails
      let recipients: string[] = [];
      if (selectAll) {
        recipients = customers?.map((c: any) => c.email) || [];
      } else {
        recipients = selectedCustomers;
      }

      // Check if we have recipients
      if (recipients.length === 0) {
        toast({
          title: "No Recipients",
          description: "No customer emails found for this branch",
          variant: "destructive"
        });
        setIsSending(false);
        return;
      }

      const result = await sendMarketingEmail({
        recipients,
        subject: emailSubject,
        htmlContent: html
      });

      if (result.success) {
        toast({
          title: "Emails Sent Successfully",
          description: `Marketing emails have been sent to ${recipients.length} customer(s) from ${branch?.name}`,
        });
        
        setEmailSent(true);
        
        // Reset form
        setTimeout(() => {
          setEmailTitle("");
          setEmailContent("");
          setEmailLink("");
          setEmailSent(false);
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to send emails');
      }
    } catch (error) {
      toast({
        title: "Failed to Send Emails",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t("Sähköpostimarkkinointi", "Email Marketing")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              {t("Valitse toimipiste", "Select Branch")}
            </Label>
            <Select 
              value={selectedBranch?.toString()} 
              onValueChange={(value) => {
                setSelectedBranch(Number(value));
                setSelectedCustomers([]);
                setSelectAll(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("Valitse toimipiste", "Select a branch")} />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBranch && customers && (
              <p className="text-sm text-gray-600">
                {customersLoading 
                  ? t("Ladataan asiakkaita...", "Loading customers...") 
                  : `${customers.length} ${t("asiakasta löydetty", "customers found")}`
                }
              </p>
            )}
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>{t("Valitse pohja", "Select Template")}</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(emailTemplates).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Subject */}
          <div className="space-y-2">
            <Label>{t("Aihe", "Subject")}</Label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter email subject"
            />
          </div>

          {/* Email Title */}
          <div className="space-y-2">
            <Label>{t("Otsikko", "Title")}</Label>
            <Input
              value={emailTitle}
              onChange={(e) => setEmailTitle(e.target.value)}
              placeholder="Enter main title"
            />
          </div>

          {/* Email Content */}
          <div className="space-y-2">
            <Label>{t("Sisältö", "Content")}</Label>
            <Textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Enter email content..."
              rows={8}
            />
          </div>

          {/* Link (for promotional template) */}
          {selectedTemplate === 'promotional' && (
            <div className="space-y-2">
              <Label>{t("Linkki", "Link URL")}</Label>
              <Input
                value={emailLink}
                onChange={(e) => setEmailLink(e.target.value)}
                placeholder="https://yourwebsite.com/offer"
              />
            </div>
          )}

          {/* Attached Image */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {t("Kuva (valinnainen)", "Attached Image (Optional)")}
            </Label>
            <Input
              value={attachedImage}
              onChange={(e) => setAttachedImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              type="url"
            />
            {attachedImage && (
              <div className="mt-2 border rounded-lg p-2">
                <img 
                  src={attachedImage} 
                  alt="Preview" 
                  className="max-w-full h-auto rounded"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.alt = 'Invalid image URL';
                  }}
                />
              </div>
            )}
          </div>

          {/* Customer Selection */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("Vastaanottajat", "Recipients")}
            </Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={(checked) => setSelectAll(!!checked)}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("Valitse kaikki asiakkaat", "Select all customers")}
              </label>
            </div>

            {!selectAll && selectedBranch && (
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {customersLoading ? (
                  <p className="text-sm text-gray-500">{t("Ladataan...", "Loading...")}</p>
                ) : customers && customers.length > 0 ? (
                  customers.map((customer: any, index: number) => (
                    <div key={customer.email} className="flex items-center space-x-2">
                      <Checkbox
                        id={`customer-${index}`}
                        checked={selectedCustomers.includes(customer.email)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCustomers([...selectedCustomers, customer.email]);
                          } else {
                            setSelectedCustomers(selectedCustomers.filter(email => email !== customer.email));
                          }
                        }}
                      />
                      <label
                        htmlFor={`customer-${index}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {customer.email} - {customer.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">{t("Ei asiakkaita", "No customers found")}</p>
                )}
              </div>
            )}
            {!selectedBranch && !selectAll && (
              <p className="text-sm text-amber-600">
                {t("Valitse ensin toimipiste", "Please select a branch first")}
              </p>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendEmail}
            disabled={isSending || !emailTitle || !emailContent || !selectedBranch}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("Lähetetään...", "Sending...")}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t("Lähetä sähköpostit", "Send Emails")}
              </>
            )}
          </Button>

          {/* Success Message */}
          {emailSent && (
            <div className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span>{t("Sähköpostit lähetetty onnistuneesti!", "Emails sent successfully!")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Esikatselu", "Preview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-4 text-center">
              {t("Tämä on likimääräinen esikatselu. Todellinen sähköposti voi näyttää hieman erilaiselta.", 
                 "This is an approximate preview. The actual email may look slightly different.")}
            </p>
            <div className="bg-white rounded border overflow-hidden max-w-[600px] mx-auto shadow-lg">
              <div className="bg-black text-white p-8 text-center">
                <img 
                  src={(restaurantConfig?.logo as any)?.imageUrl || 'https://tirvankahvila.fi/wp-content/uploads/2023/06/logo-header-01.webp'}
                  alt="Restaurant Logo" 
                  className="max-w-[200px] h-auto mx-auto mb-4 block"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <h2 className="text-2xl font-bold text-white mb-0">{emailTitle || "Email Title"}</h2>
              </div>
              <div className="p-8 bg-white text-center">
                {attachedImage && (
                  <div className="mb-6">
                    <img 
                      src={attachedImage} 
                      alt="Attached" 
                      className="max-w-full h-auto rounded-lg mx-auto"
                    />
                  </div>
                )}
                <div className="whitespace-pre-wrap text-gray-900 text-base leading-relaxed">{emailContent || "Email content will appear here..."}</div>
                {selectedTemplate === 'promotional' && emailLink && (
                  <a 
                    href={emailLink}
                    className="inline-block mt-6 bg-gradient-to-r from-red-600 to-orange-600 text-white px-10 py-3 rounded font-bold no-underline"
                  >
                    Order Now
                  </a>
                )}
              </div>
              <div className="bg-gray-100 p-6 text-center border-t">
                <p className="font-bold text-gray-900 mb-2">{restaurantConfig?.name || 'Tirvan Kahvila'}</p>
                {selectedBranch && branches?.find(b => b.id === selectedBranch) && (
                  <>
                    <p className="text-sm text-gray-600 mb-1">
                      {(branches.find(b => b.id === selectedBranch)?.address as any)?.street || branches.find(b => b.id === selectedBranch)?.address}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {branches.find(b => b.id === selectedBranch)?.phone || restaurantConfig?.phone}
                    </p>
                  </>
                )}
                {/* Social Media Icons */}
                <div className="flex justify-center gap-3 mt-4">
                  {(restaurantConfig?.socialMedia as any)?.facebook && (
                    <a href={(restaurantConfig.socialMedia as any).facebook} className="inline-block">
                      <Facebook className="w-7 h-7 text-blue-600" />
                    </a>
                  )}
                  {(restaurantConfig?.socialMedia as any)?.instagram && (
                    <a href={(restaurantConfig.socialMedia as any).instagram} className="inline-block">
                      <Instagram className="w-7 h-7 text-pink-600" />
                    </a>
                  )}
                  {(restaurantConfig?.socialMedia as any)?.website && (
                    <a href={(restaurantConfig.socialMedia as any).website} className="inline-block">
                      <Globe className="w-7 h-7 text-gray-600" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
