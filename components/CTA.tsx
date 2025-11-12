import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

const Cta = () => {
    return (
        <section className="cta-section">
            <div className="cta-badge">Discover the joy of learning, your way</div>
            <h2 className="text-3xl font-bold">
                Start your journey with Thuto today and unlock the power of AI-assisted learning.
            </h2>
            <p>Create your learning partner — pick a name, voice, and subject, and dive into fun, natural conversations.</p>
            <Image src="/images/cta.svg" alt="cta" width={362} height={232} />
            <button className="btn-primary">
                <Image src="/icons/plus.svg" alt="plus" width={12} height={12} />
                <Link href="/companions/new">
                    <p>Create your new learning buddy</p>
                </Link>

            </button>

        </section>
    )
}
export default Cta
