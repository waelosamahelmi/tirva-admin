import { useAppUpdater } from '@/hooks/use-app-updater';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Loader2, RefreshCw } from 'lucide-react';

export function UpdateChecker() {
  const { updateAvailable, updateInfo, checking, checkForUpdates, downloadUpdate, skipUpdate } = useAppUpdater();

  if (!updateAvailable || !updateInfo) {
    return null;
  }

  return (
    <Dialog open={updateAvailable} onOpenChange={(open) => !open && skipUpdate()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-green-600" />
            Update Available!
          </DialogTitle>
          <DialogDescription>
            PlateOS {updateInfo.version} is now available
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Version:</div>
            <div className="font-medium">{updateInfo.version}</div>
            
            <div className="text-muted-foreground">Size:</div>
            <div className="font-medium">{updateInfo.fileSize}</div>
            
            <div className="text-muted-foreground">Released:</div>
            <div className="font-medium">{updateInfo.releaseDate}</div>
          </div>
          
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-medium mb-1">What's new:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Bug fixes and performance improvements</li>
              <li>Latest features and updates</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={skipUpdate}
            className="w-full sm:w-auto"
          >
            Later
          </Button>
          <Button
            onClick={downloadUpdate}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Update Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ManualUpdateButton() {
  const { checking, checkForUpdates } = useAppUpdater();

  return (
    <Button
      variant="outline"
      onClick={checkForUpdates}
      disabled={checking}
      className="gap-2"
    >
      {checking ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Check for Updates
        </>
      )}
    </Button>
  );
}



