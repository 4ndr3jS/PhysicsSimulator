const buttons = document.querySelectorAll('.filter-btn');
const categorySections = document.querySelectorAll('.category-section');

buttons.forEach(button => {
    button.addEventListener('click', () =>{
        buttons.forEach(btn => btn.classList.remove('active'));

        button.classList.add('active');

        const filter = button.dataset.filter;

        categorySections.forEach(section =>{
            if(filter === 'all'){
                section.style.display = 'block';
            }else{
                if(section.dataset.category === filter){
                    section.style.display = 'block';
                }else{
                    section.style.display = 'none';
                }
            }
        });
    });
});


document.querySelectorAll('.sim-launch').forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const simTitle = button.closest('.sim-card').querySelector('.sim-title').textContent;
        alert(`Launching ${simTitle}\n\n`);
    });
});

document.querySelectorAll('.sim-card').forEach(card => {
    card.addEventListener('click', () => {
        const simTitle = card.querySelector('.sim-title').textContent;
        alert(`Opening ${simTitle}`);
    })
})