import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/router";
import axios from "axios";

export function PricingCard() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  
  const handleCheckout = async () => {
    if (!user) {
      router.push("/auth/signup");
      return;
    }

    try {
      setLoading(true);
      
      // We don't specify a price ID anymore - the backend will create a test one if needed
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/create-checkout-session`,
        {
          user_id: user.id,
          price_id: "dummy_price_id" // This will be replaced by our dynamic price
        }
      );

      // Redirect to Stripe Checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error("Error during checkout:", error);
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Lermo AI Widget</CardTitle>
        <CardDescription className="text-xl font-semibold">$19.99/month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <span>Unlimited AI widget usage</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <span>Custom branding options</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <span>Personalized AI responses</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <span>Priority support</span>
          </div>
          
          <Button 
            className="w-full mt-6" 
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? "Processing..." : "Subscribe Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 