import { proService } from './pro-service';

export function requireProFeature(featureName: string) {
    return async (req: any, res: any, next: any) => {
        if (!req.user?.id) {
            return res.status(401).json({ 
                error: 'Authentication required',
                feature: featureName
            });
        }
        
        try {
            const hasProSubscription = await proService.hasProSubscription(req.user.id);
            
            if (!hasProSubscription) {
                return res.status(403).json({
                    error: 'Pro subscription required',
                    feature: featureName,
                    upgradeRequired: true
                });
            }
            
            next();
        } catch (error) {
            console.error('Error checking Pro subscription:', error);
            return res.status(500).json({
                error: 'Error verifying subscription status'
            });
        }
    };
}

export function trackAIUsage(featureName: string) {
    return (req: any, res: any, next: any) => {
        // Add usage tracking to request for later processing
        req.aiFeatureUsed = featureName;
        next();
    };
}