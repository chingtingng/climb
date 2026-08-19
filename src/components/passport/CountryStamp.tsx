import { Stamp, type StampInk, type StampSize } from "@/components/ui/Stamp";

type Props = {
  country: string;
  size?: StampSize;
  ink?: StampInk;
};

export function CountryStamp({ country, size = "md", ink = "sky" }: Props) {
  return (
    <Stamp variant="country" country={country} size={size} ink={ink} seed={country} />
  );
}
