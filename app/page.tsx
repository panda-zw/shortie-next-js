"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useTransition } from "react";
import { z } from "zod"; // Import Zod
import { shortenUrl } from "./actions/shorten";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, CopyIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the interface for the API response
interface ApiResponse {
  short_url: string;
}

// Define a Zod schema for URL validation
const urlSchema = z.string().url();

interface ShortenedUrl {
  original_url: string;
  short_url: string;
  timestamp: number; // Add timestamp to track the age of the URL
}

const LOCAL_STORAGE_KEY = "shortenedUrls";
const EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

// Function to calculate the time ago string
const timeAgo = (timestamp: number) => {
  const now = new Date().getTime();
  const diff = now - timestamp;
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
};

export default function Home() {
  const [url, setUrl] = useState<string>("");
  const [shortUrl, setShortUrl] = useState<string>("");
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null); // State to hold validation error

  useEffect(() => {
    const storedUrls = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEY) || "[]"
    );
    const filteredUrls = storedUrls.filter((url: ShortenedUrl) => {
      return new Date().getTime() - url.timestamp < EXPIRATION_TIME;
    });
    setShortenedUrls(filteredUrls);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shortenedUrls));
  }, [shortenedUrls]);

  // Use useEffect to update the time-ago labels every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setShortenedUrls((prevUrls) => [...prevUrls]);
    }, 6000); // Update every minute

    return () => clearInterval(interval); // Cleanup the interval on component unmount
  }, []);

  const handleSubmit = async () => {
    setError(null); // Reset error state
    // Validate URL
    const validationResult = urlSchema.safeParse(url);
    if (!validationResult.success) {
      setError("Please enter a valid URL.");
      return;
    }

    startTransition(() => {
      shortenUrl({ original_url: url }).then((data: any) => {
        console.log(data);
        if (data.error) {
          toast.error("Failed to shorten URL");
          return;
        }

        if (data.short_url) {
          toast.success("URL shortened successfully");
          setShortUrl(data.short_url);

          const newShortenedUrl: ShortenedUrl = {
            original_url: url,
            short_url: data.short_url,
            timestamp: new Date().getTime(),
          };

          setShortenedUrls((prevUrls) => {
            // Check for duplicates and remove the oldest entry if needed
            const isDuplicate = prevUrls.some(
              (item) => item.original_url === url
            );
            if (isDuplicate) return prevUrls;

            const updatedUrls = [newShortenedUrl, ...prevUrls];

            // Ensure we only keep the latest 5 URLs
            if (updatedUrls.length > 5) {
              updatedUrls.pop();
            }

            return updatedUrls;
          });
        }
      });
    });
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleClear = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setShortenedUrls([]);
    toast.success("Cleared shortened URLs");
  };

  return (
    <div className="flex flex-col justify-center mx-auto p-4 w-full md:w-1/2 min-h-screen">
      <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">URL Shortener</h1>
          <p className="text-muted-foreground">
            Simple URL shortener for your convenience
          </p>
        </div>
      <Label htmlFor="url">Enter URL to shorten:</Label>
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
        <Input
          id="url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
        <Button
          className="w-full md:w-20"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? "Shortening..." : "Shorten"}
        </Button>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {shortUrl && (
        <div className="space-y-2 mt-4">
          <Alert variant="success" className="mb-10">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Shortened URL</AlertTitle>
            <AlertDescription className="flex items-center justify-between space-x-2">
              <span className="text-primary">{`${process.env.NEXT_PUBLIC_API_URL}/${shortUrl}`}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  handleCopy(`${process.env.NEXT_PUBLIC_API_URL}/${shortUrl}`)
                }
              >
                <CopyIcon className="w-4 h-4" />
              </Button>
            </AlertDescription>
          </Alert>
          {shortenedUrls.length > 0 && (
            <div className="space-y-2 mt-10">
              <div className="text-zinc-500 font-medium">
                Previously Shortened URLs
              </div>
              <div className="space-y-1">
                {shortenedUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <span className="text-primary text-sm">{`${process.env.NEXT_PUBLIC_API_URL}/${url.short_url}`}</span>
                      <div className="text-xs text-muted-foreground">
                        {timeAgo(url.timestamp)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleCopy(
                          `${process.env.NEXT_PUBLIC_API_URL}/${url.short_url}`
                        )
                      }
                    >
                      <CopyIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={handleClear}>
                Clear List
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
