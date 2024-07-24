"use server";

interface ShortenUrlResponse {
  original_url: string;
  short_url: string;
  error?: string;
  success?: boolean;
}

export const shortenUrl = async (values: {
  original_url: string;
}): Promise<ShortenUrlResponse> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shorten`, {
      method: "POST",
      body: JSON.stringify(values),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json();
      return {
        ...data,
        error: "Failed to shorten URL",
      };
    }

    const data: ShortenUrlResponse = await res.json();
    return {
      ...data,
      success: true,
    };
  } catch (err) {
    console.error(err);
    return {
      original_url: values.original_url,
      short_url: "",
      error: "An error occurred",
    };
  }
};
