import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface BandwidthContextType {
  bandwidth: number;
  setBandwidth: (val: number) => void;
  setIsDraining: (val: boolean) => void;
}

const BandwidthContext = createContext<BandwidthContextType | null>(null);

export const BandwidthProvider = ({ children }: { children: ReactNode }) => {
  const [bandwidth, setBandwidth] = useState<number>(100);
  const [isDraining, setIsDraining] = useState<boolean>(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isDraining && bandwidth > 0) {
      // 60-second tick keeps UI thread idle and CPU cool.
      // CSS transition on the bar handles the visual smoothing.
      interval = setInterval(() => {
        setBandwidth((prev) => {
          const nextValue = prev - 6; // 0.1/s * 60s
          return nextValue > 0 ? nextValue : 0;
        });
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDraining, bandwidth]);

  return (
    <BandwidthContext.Provider value={{ bandwidth, setBandwidth, setIsDraining }}>
      {children}
    </BandwidthContext.Provider>
  );
};

export const useBandwidth = () => {
  const context = useContext(BandwidthContext);
  if (!context) throw new Error("useBandwidth must be used within a BandwidthProvider");
  return context;
};


