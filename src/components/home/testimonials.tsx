import { Quote, Star } from 'lucide-react'
import { SectionHeading } from './section-heading'

const TESTIMONIALS = [
  {
    quote: 'ఈ యాప్ ద్వారా నా బిజినెస్ కు కొత్త కస్టమర్లు వస్తున్నారు. సూపర్ యాప్!',
    author: 'రమేష్',
    role: 'Business Owner',
    grad: 'from-blue-500 to-blue-300',
  },
  {
    quote: 'రియల్ ఎస్టేట్ ప్రాపర్టీల కోసం నేను రోజూ వాడుతున్నాను.',
    author: 'సురేష్',
    role: 'Real Estate Agent',
    grad: 'from-amber-500 to-amber-300',
  },
  {
    quote: 'ఊరిలో అన్ని షాపులు, సర్వీసెస్ ఒకేచోట దొరుకుతున్నాయి. చాలా ఉపయోగం!',
    author: 'లక్ష్మి',
    role: 'Homemaker',
    grad: 'from-sky-500 to-blue-300',
  },
  {
    quote: 'నా క్లినిక్ కి రోజూ 5-6 కొత్త పేషంట్లు ఈ యాప్ ద్వారా వస్తున్నారు.',
    author: 'డాక్టర్ రాజు',
    role: 'Doctor',
    grad: 'from-amber-500 to-blue-400',
  },
]

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <SectionHeading
        title="What People Say"
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.map((t, i) => (
          <figure
            key={i}
            className="hover-glow relative overflow-hidden rounded-2xl glass p-5"
          >
            <Quote className="h-7 w-7 text-blue-200" />
            <blockquote className="font-telugu mt-3 text-[15px] leading-relaxed text-slate-800">
              {t.quote}
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              <span
                className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${t.grad} text-sm font-bold text-white`}
              >
                {t.author.charAt(0)}
              </span>
              <figcaption>
                <p className="font-telugu text-sm font-bold text-slate-900">
                  {t.author}
                </p>
                <p className="text-xs text-slate-500">{t.role}</p>
              </figcaption>
              <div className="ml-auto flex">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
            </div>
          </figure>
        ))}
      </div>
    </section>
  )
}
